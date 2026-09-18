import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, User, Bot } from 'lucide-react';
import './MessageBubble.css';

/**
 * Normalizes LaTeX delimiters so remark-math and rehype-katex can render them:
 * 1. Converts \[ ... \] to $$ ... $$ (display math)
 * 2. Converts \( ... \) to $ ... $ (inline math)
 */
function preprocessLaTeX(content) {
  if (!content) return '';
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => `$$\n${eq.trim()}\n$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => `$${eq.trim()}$`);
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    const handleCopy = () => {
      navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (!inline && match) {
      return (
        <div className="code-block-wrapper">
          <div className="code-block-header">
            <div className="code-window-dots">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <span className="code-lang">{match[1]}</span>
            <button className="copy-btn" onClick={handleCopy}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  const formattedContent = useMemo(() => {
    return !isUser ? preprocessLaTeX(message.content) : message.content;
  }, [message.content, isUser]);

  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      <div className="avatar">
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>
      <div className="message-content">
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { throwOnError: false, errorColor: '#f87171' }]]}
            components={{
              code: CodeBlock
            }}
          >
            {formattedContent}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}