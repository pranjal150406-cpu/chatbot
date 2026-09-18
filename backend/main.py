import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes.chat_routes import router as chat_router
from routes.chats_routes import router as chats_router
from services import db

# Load environment variables from .env
load_dotenv()

# Initialize SQLite database
db.init_db()

app = FastAPI(
    title="Full-Stack AI Chatbot Backend",
    description="Secure FastAPI backend providing AI capabilities with model abstraction.",
    version="1.0.0"
)

# Configure CORS for local development
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(chat_router, prefix="/api")
app.include_router(chats_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "AI Chatbot Backend API is running!",
        "frontend_url": "http://localhost:5173",
        "instructions": "Open http://localhost:5173 in your browser to use the chatbot UI.",
        "api_docs": "http://localhost:8000/docs"
    }

@app.get("/api/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "provider": os.getenv("LLM_PROVIDER", "gemini")}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)