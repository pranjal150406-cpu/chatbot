import time
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from services import db

router = APIRouter()

class ChatSessionSummary(BaseModel):
    id: str
    title: str
    timestamp: str

class ChatSessionDetail(BaseModel):
    id: str
    title: str
    timestamp: str
    messages: List[Dict[str, Any]] = []

class SaveChatRequest(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    timestamp: Optional[str] = None
    messages: List[Dict[str, Any]] = []

@router.get("/chats", response_model=List[ChatSessionSummary])
async def list_chats():
    """Returns a list of all chat sessions (id, title, timestamp) ordered by newest first."""
    try:
        return db.get_all_chats()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list chats: {str(e)}"
        )

@router.get("/chats/{chat_id}", response_model=ChatSessionDetail)
async def get_chat(chat_id: str):
    """Returns full messages for one session."""
    chat = db.get_chat(chat_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{chat_id}' not found."
        )
    return chat

@router.post("/chats", response_model=ChatSessionDetail)
async def create_or_save_chat(request: SaveChatRequest):
    """Creates a new chat session or updates an existing one."""
    chat_id = request.id if request.id else str(int(time.time() * 1000))
    timestamp = request.timestamp if request.timestamp else datetime.utcnow().isoformat()
    
    title = request.title
    if not title:
        # Generate title from first user message, truncated
        user_messages = [m for m in request.messages if m.get("role") == "user"]
        if user_messages and user_messages[0].get("content"):
            first_text = user_messages[0]["content"].strip()
            title = first_text[:35] + ("..." if len(first_text) > 35 else "")
        else:
            title = "New Conversation"

    saved = db.save_chat(
        chat_id=chat_id,
        title=title,
        timestamp=timestamp,
        messages=request.messages
    )
    return saved

@router.delete("/chats/{chat_id}")
async def delete_chat_endpoint(chat_id: str):
    """Deletes a specific chat session."""
    deleted = db.delete_chat(chat_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{chat_id}' not found."
        )
    return {"status": "deleted", "id": chat_id}

@router.delete("/chats")
async def clear_all_chats_endpoint():
    """Deletes all chat sessions."""
    count = db.clear_all_chats()
    return {"status": "cleared", "count": count}
