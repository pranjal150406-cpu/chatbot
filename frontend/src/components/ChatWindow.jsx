import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import { Bot } from 'lucide-react';
import './ChatWindow.css';

export default function ChatWindow({ messages, isLoading, onPromptClick }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!messages || messages.length === 0) {
    return <WelcomeScreen onPromptClick={onPromptClick} />;
  }

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {isLoading && (
          <div className="message-row assistant">
            <div className="avatar">
              <Bot size={18} />
            </div>
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}