import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Check, ChevronLeft, Settings, Clock } from 'lucide-react';
import './Sidebar.css';

function formatTimestamp(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (isToday) {
      return timeStr;
    }
    if (isYesterday) {
      return `Yesterday`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function Sidebar({
  conversations = [],
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  isCollapsed = false,
  onToggleCollapse,
  onOpenSettings,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const startEditing = (e, chat) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const saveEditing = (e, id) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${!isCollapsed ? 'active' : ''}`}
        onClick={onToggleCollapse}
      />

      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <button
            className="collapse-toggle-btn"
            onClick={onToggleCollapse}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <ChevronLeft size={20} />
          </button>
          <button className="new-chat-btn" onClick={onNewChat} title="Start New Chat">
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="no-history">No past conversations</div>
          ) : (
            conversations.map((chat) => {
              const isActive = chat.id === activeChatId;
              const isEditing = chat.id === editingId;
              const formattedTime = formatTimestamp(chat.timestamp);

              return (
                <div
                  key={chat.id}
                  className={`chat-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectChat(chat.id)}
                  title={chat.title}
                >
                  <MessageSquare size={16} className="chat-icon" />

                  <div className="chat-item-content">
                    {isEditing ? (
                      <input
                        className="edit-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing(e, chat.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="chat-title">{chat.title}</span>
                        {formattedTime && (
                          <span className="chat-timestamp">
                            <Clock size={10} className="timestamp-icon" />
                            {formattedTime}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="chat-actions">
                    {isEditing ? (
                      <button
                        className="action-btn"
                        onClick={(e) => saveEditing(e, chat.id)}
                        title="Save title"
                      >
                        <Check size={14} />
                      </button>
                    ) : (
                      <>
                        <button
                          className="action-btn"
                          onClick={(e) => startEditing(e, chat)}
                          title="Rename chat"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                          }}
                          title="Delete chat"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="sidebar-footer">
          <button className="footer-btn" onClick={onOpenSettings} title="Settings">
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
}