import React from 'react';
import { TrendingUp, Globe, Sparkles, BookOpen } from 'lucide-react';
import './WelcomeScreen.css';

export default function WelcomeScreen({ onPromptClick }) {
  const examplePrompts = [
    {
      icon: <TrendingUp size={20} />,
      title: 'Current US GDP & Economy',
      prompt: 'What is the current GDP of America and how has it grown recently?',
    },
    {
      icon: <Globe size={20} />,
      title: 'General Knowledge & Science',
      prompt: 'Explain how GPS satellites triangulate exact positions on Earth.',
    },
    {
      icon: <Sparkles size={20} />,
      title: 'Analysis & Concepts',
      prompt: 'What are the main causes of inflation and how do interest rates help control it?',
    },
    {
      icon: <BookOpen size={20} />,
      title: 'Writing & Communication',
      prompt: 'Help me draft a concise and professional email proposing a project update meeting.',
    },
  ];

  return (
    <div className="welcome-container">
      <div className="welcome-badge">
        <span className="badge-dot"></span>
        <span>General AI Assistant • Powered by Gemini 3.5</span>
      </div>

      <h2 className="welcome-title">What would you like to know today?</h2>
      <p className="welcome-subtitle">
        Ask me anything — economics, science, current events, analysis, or general conversation.
      </p>

      <div className="prompt-grid">
        {examplePrompts.map((item, idx) => (
          <div
            key={idx}
            className="prompt-card"
            onClick={() => onPromptClick(item.prompt)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onPromptClick(item.prompt)}
          >
            <div className="card-icon">{item.icon}</div>
            <div className="card-text">
              <h3>{item.title}</h3>
              <p>{item.prompt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}