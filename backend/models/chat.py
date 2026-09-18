from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(..., min_length=1, description="Message body text")

class ChatRequest(BaseModel):
    messages: List[Message] = Field(..., min_items=1, description="Sequential history of chat messages")
    client_time: Optional[str] = Field(None, description="ISO timestamp from client")
    timezone: Optional[str] = Field(None, description="Client IANA timezone name, e.g. 'Asia/Kolkata'")

class ChatResponse(BaseModel):
    message: Message