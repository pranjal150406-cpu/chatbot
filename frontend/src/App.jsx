import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import { sendChatMessage, getChats, getChat, saveChat, deleteChat, clearAllChats, checkHealth } from './services/api';
import { X } from 'lucide-react';

const THEME_KEY = 'ai_chatbot_theme';

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ online: false, checking: true });
  const selectionVersionRef = useRef(0);
  const requestInFlightRef = useRef(false);
  const clearVersionRef = useRef(0);

  // Probe backend health status
  const refreshHealth = useCallback(async () => {
    setBackendStatus((prev) => ({ ...prev, checking: true }));
    const result = await checkHealth();
    setBackendStatus({ online: result.online, checking: false, provider: result.provider });
  }, []);

  // Initialize theme and health check
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    refreshHealth();
    const interval = setInterval(refreshHealth, 15000);
    return () => clearInterval(interval);
  }, [refreshHealth]);

  // Responsive window resize listener
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch conversations from SQLite backend on initial mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const chatsList = await getChats();
        if (chatsList && chatsList.length > 0) {
          setConversations(chatsList);
          // Load the latest chat
          const latestChat = await getChat(chatsList[0].id);
          setActiveChatId(latestChat.id);
          setCurrentMessages(latestChat.messages || []);
        }
      } catch (err) {
        console.error('Failed loading chats from backend:', err);
      }
    }
    loadInitialData();
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleSelectChat = async (id) => {
    const selectionVersion = ++selectionVersionRef.current;
    if (window.innerWidth < 1024) {
      setIsSidebarCollapsed(true);
    }
    if (id === activeChatId) return;
    setActiveChatId(id);
    try {
      const fullChat = await getChat(id);
      if (selectionVersion === selectionVersionRef.current) {
        setCurrentMessages(fullChat.messages || []);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  const handleNewChat = () => {
    selectionVersionRef.current += 1;
    if (window.innerWidth < 1024) {
      setIsSidebarCollapsed(true);
    }
    setActiveChatId(null);
    setCurrentMessages([]);
  };

  const activeChat = conversations.find((c) => c.id === activeChatId) || null;

  const handleSendMessage = async (text) => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    const selectionVersion = selectionVersionRef.current;
    const clearVersion = clearVersionRef.current;
    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...currentMessages, userMsg];
    setCurrentMessages(updatedMessages);
    setIsLoading(true);

    const currentChatId = activeChatId;
    const currentTitle =
      activeChat && activeChat.title !== 'New Conversation'
        ? activeChat.title
        : text.slice(0, 35) + (text.length > 35 ? '...' : '');
    let receivedAnswer = false;

    try {
      // Backend request payload with complete conversation history
      const historyPayload = updatedMessages.map(({ role, content }) => ({ role, content }));
      const response = await sendChatMessage(historyPayload);
      receivedAnswer = true;

      const botMsg = response.message;
      const finalMessages = [...updatedMessages, botMsg];
      if (selectionVersion === selectionVersionRef.current) {
        setCurrentMessages(finalMessages);
      }

      // Persist conversation to SQLite backend
      const saved = clearVersion === clearVersionRef.current
        ? await saveChat({
            id: currentChatId || undefined,
            title: currentTitle,
            messages: finalMessages,
          })
        : null;

      if (saved && selectionVersion === selectionVersionRef.current) {
        setActiveChatId(saved.id);
      }
      if (saved) setConversations((prev) => {
        const exists = prev.some((c) => c.id === saved.id);
        if (exists) {
          return prev.map((c) =>
            c.id === saved.id ? { ...c, title: saved.title, timestamp: saved.timestamp } : c
          );
        } else {
          return [{ id: saved.id, title: saved.title, timestamp: saved.timestamp }, ...prev];
        }
      });
      // Update health status to online if successful
      setBackendStatus((prev) => ({ ...prev, online: true, checking: false }));
    } catch (err) {
      if (receivedAnswer) {
        console.error('Gemini answered, but the conversation could not be saved:', err);
        setBackendStatus((prev) => ({ ...prev, online: true, checking: false }));
        return;
      }
      // Keep the prompt if the model fails so it isn't lost on refresh.
      if (clearVersion === clearVersionRef.current) {
        try {
          const savedDraft = await saveChat({
            id: currentChatId || undefined,
            title: currentTitle,
            messages: updatedMessages,
          });
          if (selectionVersion === selectionVersionRef.current) {
            setActiveChatId(savedDraft.id);
          }
          setConversations((prev) => {
            const exists = prev.some((chat) => chat.id === savedDraft.id);
            return exists
              ? prev.map((chat) => chat.id === savedDraft.id
                  ? { ...chat, title: savedDraft.title, timestamp: savedDraft.timestamp }
                  : chat)
              : [{ id: savedDraft.id, title: savedDraft.title, timestamp: savedDraft.timestamp }, ...prev];
          });
        } catch (saveError) {
          console.error('Could not save the unanswered user message:', saveError);
        }
      }
      const errorMsg = {
        role: 'assistant',
        content: `⚠️ ${err.message || "Sorry, I couldn't connect to the AI service. Please check your backend connection or API key."}`
      };
      if (selectionVersion === selectionVersionRef.current) {
        setCurrentMessages((prev) => [...prev, errorMsg]);
      }
      // Update health status to offline if failed to connect
      if (err.message && err.message.includes('backend server')) {
        setBackendStatus({ online: false, checking: false });
      }
    } finally {
      requestInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  const handleRenameChat = async (id, newTitle) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
    try {
      const chat = await getChat(id);
      await saveChat({
        id,
        title: newTitle,
        timestamp: chat.timestamp,
        messages: chat.messages || [],
      });
    } catch (err) {
      console.error('Failed to rename chat:', err);
    }
  };

  const handleDeleteChat = async (id) => {
    try {
      await deleteChat(id);
      const filtered = conversations.filter((c) => c.id !== id);
      setConversations(filtered);
      if (activeChatId === id) {
        if (filtered.length > 0) {
          await handleSelectChat(filtered[0].id);
        } else {
          selectionVersionRef.current += 1;
          setActiveChatId(null);
          setCurrentMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all chat history?')) {
      try {
        await clearAllChats();
        selectionVersionRef.current += 1;
        clearVersionRef.current += 1;
        setConversations([]);
        setActiveChatId(null);
        setCurrentMessages([]);
        setIsSettingsOpen(false);
      } catch (err) {
        console.error('Failed to clear chats:', err);
      }
    }
  };

  return (
    <div className="app-container">
      <div className="ambient-background">
        <div className="ambient-blob blob-1"></div>
        <div className="ambient-blob blob-2"></div>
      </div>

      <Sidebar
        conversations={conversations}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="main-content">
        <Header
          title={activeChat ? activeChat.title : 'AI Chat Assistant'}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          backendStatus={backendStatus}
          onRefreshHealth={refreshHealth}
        />

        <ChatWindow
          messages={currentMessages}
          isLoading={isLoading}
          onPromptClick={handleSendMessage}
        />

        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Settings</h3>
              <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-group">
              <label>Theme</label>
              <select
                className="modal-select"
                value={theme}
                onChange={(e) => {
                  setTheme(e.target.value);
                  document.documentElement.setAttribute('data-theme', e.target.value);
                  localStorage.setItem(THEME_KEY, e.target.value);
                }}
              >
                <option value="dark">Dark Mode</option>
                <option value="light">Light Mode</option>
              </select>
            </div>
            <div className="modal-group">
              <label>AI Model Provider</label>
              <select className="modal-select" disabled>
                <option>{`Google Gemini (${backendStatus.model || 'configured model'}) via backend`}</option>
              </select>
            </div>
            <button className="btn-danger" onClick={handleClearAll}>
              Clear All Conversations
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
