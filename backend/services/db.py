import os
import sqlite3
import json
from typing import List, Dict, Any, Optional

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "chats.db"))

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the SQLite database and creates tables if they do not exist."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                messages TEXT NOT NULL
            )
        """)
        conn.commit()
    finally:
        conn.close()

def get_all_chats() -> List[Dict[str, Any]]:
    """Returns a list of all chat sessions (summary without full messages) ordered by timestamp descending."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, timestamp FROM chats ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        return [
            {
                "id": row["id"],
                "title": row["title"],
                "timestamp": row["timestamp"],
            }
            for row in rows
        ]
    finally:
        conn.close()

def get_chat(chat_id: str) -> Optional[Dict[str, Any]]:
    """Returns a single chat session including full messages list, or None if not found."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, timestamp, messages FROM chats WHERE id = ?", (chat_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "title": row["title"],
            "timestamp": row["timestamp"],
            "messages": json.loads(row["messages"]) if row["messages"] else [],
        }
    finally:
        conn.close()

def save_chat(chat_id: str, title: str, timestamp: str, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Inserts or updates a chat session with its full message history."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        messages_json = json.dumps(messages)
        cursor.execute("""
            INSERT INTO chats (id, title, timestamp, messages)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title,
                timestamp=excluded.timestamp,
                messages=excluded.messages
        """, (chat_id, title, timestamp, messages_json))
        conn.commit()
        return {
            "id": chat_id,
            "title": title,
            "timestamp": timestamp,
            "messages": messages,
        }
    finally:
        conn.close()

def delete_chat(chat_id: str) -> bool:
    """Deletes a chat session by ID. Returns True if deleted, False if not found."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

def clear_all_chats() -> int:
    """Deletes all chat sessions."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chats")
        conn.commit()
        return cursor.rowcount
    finally:
        conn.close()
