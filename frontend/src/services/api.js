const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Sends messages array to FastAPI backend proxy
 * @param {Array<{role: string, content: string}>} messages 
 */
export async function sendChatMessage(messages) {
  try {
    const clientTime = new Date().toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        client_time: clientTime,
        timezone: timezone,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to communicate with AI Backend');
    }

    return await response.json();
  } catch (err) {
    console.error('API Service Error:', err);
    if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
      throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Please ensure the FastAPI backend is running.`);
    }
    throw err;
  }
}

/**
 * Probes the backend /api/health endpoint to verify real-time connectivity
 * @returns {Promise<{online: boolean, provider?: string, error?: string}>}
 */
export async function checkHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      return { online: true, provider: data.provider || 'gemini' };
    }
    return { online: false, error: `HTTP ${response.status}` };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

/**
 * Fetches all saved chat sessions from SQLite backend (id, title, timestamp)
 */
export async function getChats() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chats`);
    if (!response.ok) {
      throw new Error('Failed to fetch chat sessions');
    }
    return await response.json();
  } catch (err) {
    console.error('Failed to get chats:', err);
    return [];
  }
}

/**
 * Fetches full chat history for a specific session ID
 * @param {string} id 
 */
export async function getChat(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chats/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to load chat ${id}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Error loading chat ${id}:`, err);
    throw err;
  }
}

/**
 * Saves or updates a chat session in SQLite backend
 * @param {{id?: string, title?: string, timestamp?: string, messages: Array}} chatData 
 */
export async function saveChat(chatData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatData),
    });

    if (!response.ok) {
      throw new Error('Failed to save chat session');
    }

    return await response.json();
  } catch (err) {
    console.error('Error saving chat session:', err);
    throw err;
  }
}

/**
 * Deletes a chat session from SQLite backend
 * @param {string} id 
 */
export async function deleteChat(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chats/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete chat ${id}`);
    }

    return await response.json();
  } catch (err) {
    console.error(`Error deleting chat ${id}:`, err);
    throw err;
  }
}

/**
 * Clears all chat sessions from SQLite backend
 */
export async function clearAllChats() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chats`, {
      method: 'DELETE',
    });
    return await response.json();
  } catch (err) {
    console.error('Error clearing all chats:', err);
    throw err;
  }
}