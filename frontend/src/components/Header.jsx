import React from 'react';
import { Menu, X, Sun, Moon, Settings, Bot } from 'lucide-react';
import './Header.css';

export default function Header({
  title,
  theme,
  onToggleTheme,
  onToggleSidebar,
  onOpenSettings,
  isSidebarCollapsed = false,
  backendStatus = { online: true, checking: false },
  onRefreshHealth,
}) {
  return (
    <header className="chat-header">
      <div className="header-left">
        <button
          className={`icon-button sidebar-toggle ${isSidebarCollapsed ? 'visible' : ''}`}
          onClick={onToggleSidebar}
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          <Menu size={20} />
        </button>
        <div className="header-title-container">
          <Bot className="bot-icon" size={22} />
          <h1 className="header-title">{title}</h1>
        </div>
      </div>

      <div className="header-actions">
        <div
          className={`status-badge ${backendStatus.online ? 'online' : 'offline'}`}
          onClick={onRefreshHealth}
          title={
            backendStatus.online
              ? 'Connected to Gemini LLM (Online)'
              : 'Backend server offline (Click to retry)'
          }
          role="button"
          tabIndex={0}
        >
          <span className="status-indicator-dot" />
          <span className="status-label">
            {backendStatus.checking
              ? 'Checking...'
              : backendStatus.online
              ? 'Gemini 3.5'
              : 'Offline'}
          </span>
        </div>

        <button className="icon-button" onClick={onToggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <button className="icon-button" onClick={onOpenSettings} title="Settings">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}