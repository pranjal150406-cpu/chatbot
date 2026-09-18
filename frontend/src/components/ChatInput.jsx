import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import './ChatInput.css';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const baseTextRef = useRef('');
  const textRef = useRef('');

  // Keep textRef updated with current text value to avoid stale closures
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSpeechSupported(!!SpeechRecognition);

    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const createRecognitionInstance = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    // continuous = false ensures instant interim results on every syllable without audio buffering lag
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      const activeSpeech = finalTranscript || interimTranscript;
      if (activeSpeech) {
        const base = baseTextRef.current;
        const separator = base && !base.endsWith(' ') ? ' ' : '';
        const updated = base ? `${base}${separator}${activeSpeech}` : activeSpeech;
        setText(updated);
        textRef.current = updated;
        if (finalTranscript) {
          baseTextRef.current = updated;
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn('[SpeechRecognition] error:', event.error);

      // Ignore silence events so listening continues naturally across pauses
      if (event.error === 'no-speech') {
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        isListeningRef.current = false;
        setIsListening(false);
        alert(
          "Microphone access was denied or blocked.\n\n" +
          "1. In Chrome / Edge: Click the lock or settings icon next to the address bar and select 'Allow' for Microphone.\n" +
          "2. If using VS Code's internal browser tab: Please open http://localhost:5173 directly in Google Chrome or Microsoft Edge."
        );
        return;
      }

      if (event.error === 'audio-capture') {
        isListeningRef.current = false;
        setIsListening(false);
        alert("No microphone was detected. Please verify your microphone is plugged in and set as default.");
        return;
      }

      if (event.error === 'network') {
        console.warn("[SpeechRecognition] Network issue connecting to speech service. Trying fallback language.");
        if (recognition.lang === 'en-IN') {
          recognition.lang = navigator.language || 'en-US';
        }
      }
    };

    recognition.onend = () => {
      // If user hasn't explicitly stopped, continue listening seamlessly
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          setTimeout(() => {
            if (isListeningRef.current) {
              try {
                recognition.start();
              } catch (err) {}
            }
          }, 150);
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    // Detect if running inside VS Code Simple Browser / Electron
    const isElectronOrVSCode = /electron|code/i.test(navigator.userAgent);
    if (isElectronOrVSCode) {
      alert(
        "⚠️ Voice Input Notice:\n\n" +
        "You are using VS Code's internal browser tab. VS Code's embedded browser blocks Google Speech Recognition services.\n\n" +
        "Please open http://localhost:5173 (or http://localhost:5174) in your regular Google Chrome or Microsoft Edge browser to speak."
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      baseTextRef.current = text;
      textRef.current = text;
      isListeningRef.current = true;
      setIsListening(true);

      const recognition = createRecognitionInstance();
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSend = () => {
    if (isListening) {
      stopListening();
    }
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
      textRef.current = '';
      baseTextRef.current = '';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      // limit scroll height to max-height (approx 160px)
      textarea.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, [text]);

  return (
    <div className="chat-input-container">
      <div className={`chat-input-wrapper ${isListening ? 'listening' : ''}`}>
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder={isListening ? "Listening... Speak into your microphone" : "Ask me anything..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
        />
        <div className="chat-input-actions">
          <button
            type="button"
            className={`mic-button ${isListening ? 'listening' : ''}`}
            onClick={toggleListening}
            disabled={disabled || !isSpeechSupported}
            title={
              !isSpeechSupported
                ? "Speech recognition is not supported in this browser"
                : isListening
                ? "Listening... Click to stop"
                : "Voice input (Click to speak)"
            }
            aria-label="Voice input"
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button
            type="button"
            className="send-button"
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            title="Send message"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
      <div className="chat-footer">
        {isListening ? (
          <span className="listening-indicator">
            <span className="listening-dot"></span>
            Listening (en-IN)... Click mic again or Send when done
          </span>
        ) : (
          "Powered by Gemini 3.5 Flash • Enter to send, Shift+Enter for new line"
        )}
      </div>
    </div>
  );
}