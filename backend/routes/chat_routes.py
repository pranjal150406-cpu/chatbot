from fastapi import APIRouter, HTTPException, status
from models.chat import ChatRequest, ChatResponse
from services.llm_service import LLMService

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main endpoint for sending conversation history to the LLM backend proxy.
    """
    try:
        llm_service = LLMService()
        assistant_message = await llm_service.chat(
            messages=request.messages,
            client_time=request.client_time,
            client_timezone=request.timezone
        )
        return ChatResponse(message=assistant_message)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuration error: {str(ve)}"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service connection failed: {str(e)}"
        )