import os
from typing import List, Optional
from datetime import datetime, timezone
import zoneinfo
from dotenv import load_dotenv
from google import genai
from google.genai import types
from models.chat import Message

# Guarantee .env is loaded
load_dotenv()

class BaseLLMProvider:
    """Base interface for all LLM service providers."""
    async def generate_response(
        self,
        messages: List[Message],
        client_time: Optional[str] = None,
        client_timezone: Optional[str] = None
    ) -> str:
        raise NotImplementedError("Providers must implement generate_response")

class GeminiProvider(BaseLLMProvider):
    """Google Gemini LLM Provider implementation using the official google-genai SDK."""
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is missing.")
        
        self.model_name = os.getenv("LLM_MODEL", "gemini-3.5-flash")
        self.client = genai.Client(api_key=api_key)

    def _build_temporal_context(self, client_time: Optional[str] = None, client_timezone: Optional[str] = None) -> str:
        """Dynamically computes the accurate real-time date, time, and timezone context."""
        now_utc = datetime.now(timezone.utc)
        target_dt = None
        tz_label = None

        # Try user/client timezone if supplied
        if client_timezone:
            try:
                tz = zoneinfo.ZoneInfo(client_timezone)
                target_dt = now_utc.astimezone(tz)
                tz_label = client_timezone
            except Exception:
                pass

        # Fallback to server local timezone
        if not target_dt:
            target_dt = datetime.now().astimezone()
            tz_label = target_dt.tzname() or "Local Time"

        date_str = target_dt.strftime("%A, %B %d, %Y")
        time_12h = target_dt.strftime("%I:%M:%S %p")
        time_24h = target_dt.strftime("%H:%M:%S")
        day_of_week = target_dt.strftime("%A")
        utc_str = now_utc.strftime("%A, %B %d, %Y at %I:%M:%S %p UTC")

        return (
            "REAL-TIME TEMPORAL CONTEXT (LIVE CLOCK):\n"
            f"- Current Date: {date_str}\n"
            f"- Current Time: {time_12h} ({time_24h}) [{tz_label}]\n"
            f"- Day of the Week: {day_of_week}\n"
            f"- Current Year: {target_dt.year}\n"
            f"- Current UTC Time: {utc_str}\n"
            f"- Timezone: {tz_label}\n\n"
            "Date and Time Guidelines:\n"
            "- You have direct access to the live clock shown above.\n"
            "- When asked about today's date, the current time, day of the week, month, year, or relative dates "
            "(e.g., 'what day is tomorrow?', 'how many days until Friday?'), answer confidently, clearly, and accurately using this temporal data.\n"
            "- Specify the time along with the timezone (e.g. IST, UTC, or local time).\n"
            "- Never state that you lack real-time access or that your knowledge is cut off when asked for current time or date."
        )

    async def generate_response(
        self,
        messages: List[Message],
        client_time: Optional[str] = None,
        client_timezone: Optional[str] = None
    ) -> str:
        try:
            # Build current temporal context
            temporal_info = self._build_temporal_context(client_time, client_timezone)

            # Build conversation history in Google GenAI SDK contents format
            contents = []
            system_instruction = (
                "You are an intelligent, helpful, and conversational AI assistant. "
                "You can answer questions on any topic, including general knowledge, economics, "
                "science, technology, programming, mathematics, algorithms, writing, and current events.\n\n"
                f"{temporal_info}\n\n"
                "Provide accurate, clear, and well-structured markdown answers. "
                "When writing mathematical expressions, symbols, or equations, always format them using "
                "standard LaTeX notation: use $...$ for inline math (e.g. $x^2 + y^2 = r^2$, $\\infty$) "
                "and $$...$$ on separate lines for block/display math."
            )

            for msg in messages:
                if msg.role == "system":
                    system_instruction = msg.content
                    continue
                
                # Map role names ('assistant' -> 'model')
                role = "model" if msg.role == "assistant" else "user"
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=msg.content)]
                    )
                )

            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            )

            # Synchronous client call wrapped safely
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config
            )
            
            if not response or not response.text:
                raise Exception("Received empty response from Gemini API.")

            return response.text

        except Exception as e:
            # Cleanly re-raise for upstream handling
            raise Exception(f"Gemini API Error: {str(e)}")

class LLMService:
    """Abstraction layer factory allowing switching between AI providers seamlessly."""
    def __init__(self):
        provider_type = os.getenv("LLM_PROVIDER", "gemini").lower()
        if provider_type == "gemini":
            self.provider = GeminiProvider()
        else:
            raise ValueError(f"Unsupported LLM provider configured: {provider_type}")

    async def chat(
        self,
        messages: List[Message],
        client_time: Optional[str] = None,
        client_timezone: Optional[str] = None
    ) -> Message:
        response_text = await self.provider.generate_response(
            messages=messages,
            client_time=client_time,
            client_timezone=client_timezone
        )
        return Message(role="assistant", content=response_text)