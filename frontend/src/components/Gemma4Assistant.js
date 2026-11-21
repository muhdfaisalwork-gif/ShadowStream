/**
 * Gemma4Assistant.js
 * Frontend I/O AI Assistant for SSMoviesTVs
 * Powered directly by Gemma 4 (Ollama / Edge AI Gateway)
 *
 * Dedicated to Frontend user interactions: natural language search,
 * personalized recommendations, viewport aspect mode triggers, and navigation.
 */
import React, { useState, useRef, useEffect } from 'react';
import './Gemma4Assistant.css';

export default function Gemma4Assistant({ onNavigate, onSetScreenMode, currentScreenMode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "👋 Hi! I'm Gemma 4, your streaming copilot. Looking for a movie, TV show, or specific genre? Or want me to switch screen aspect ratio (Fit, Fill, Full, Crop, Stretch)?"
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e?.preventDefault();
        const query = input.trim();
        if (!query || isLoading) return;

        const newMessages = [...messages, { role: 'user', content: query }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        // Check for local instant screen mode commands
        const lower = query.toLowerCase();
        if (lower.includes('fill')) {
            onSetScreenMode && onSetScreenMode('fill');
            setMessages(prev => [...prev, { role: 'assistant', content: '📐 Switched screen mode to **Fill** (content fills viewport, zero black bars).' }]);
            setIsLoading(false);
            return;
        } else if (lower.includes('full')) {
            onSetScreenMode && onSetScreenMode('full');
            setMessages(prev => [...prev, { role: 'assistant', content: '📐 Switched screen mode to **Full** (immersive 1.08x full viewport overscan).' }]);
            setIsLoading(false);
            return;
        } else if (lower.includes('crop')) {
            onSetScreenMode && onSetScreenMode('crop');
            setMessages(prev => [...prev, { role: 'assistant', content: '📐 Switched screen mode to **Crop** (2.39:1 scope cinema crop).' }]);
            setIsLoading(false);
            return;
        } else if (lower.includes('stretch')) {
            onSetScreenMode && onSetScreenMode('stretch');
            setMessages(prev => [...prev, { role: 'assistant', content: '📐 Switched screen mode to **Stretch** (full screen stretched anamorphic).' }]);
            setIsLoading(false);
            return;
        } else if (lower.includes('fit')) {
            onSetScreenMode && onSetScreenMode('fit');
            setMessages(prev => [...prev, { role: 'assistant', content: '📐 Switched screen mode to **Fit** (original aspect ratio with letterboxing).' }]);
            setIsLoading(false);
            return;
        }

        try {
            const apiBase = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                ? 'http://localhost:5000'
                : '';
            const res = await fetch(`${apiBase}/api/v1/ai/frontend-gateway`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: query,
                    conversation: newMessages.slice(-4),
                    context: { currentScreenMode }
                })
            });

            if (!res.ok) {
                throw new Error(`Gateway returned HTTP ${res.status}`);
            }

            const data = await res.json();
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.reply || "I couldn't process that recommendation right now, but feel free to search titles above!"
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm ready to help with recommendations or screen controls. Try searching for genres like 'Action sci-fi movies from 2024' or saying 'switch to fill screen'!"
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="gemma4-assistant-container">
            {!isOpen && (
                <button
                    className="gemma4-assistant-bubble"
                    onClick={() => setIsOpen(true)}
                    title="Ask Gemma 4 Frontend AI"
                    aria-label="Open Gemma 4 Assistant"
                >
                    <span className="gemma4-badge">Gemma 4</span>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                </button>
            )}

            {isOpen && (
                <div className="gemma4-assistant-window">
                    <div className="gemma4-assistant-header">
                        <div className="gemma4-assistant-title">
                            <span className="gemma4-status-dot"></span>
                            <span>Gemma 4 • Frontend AI</span>
                        </div>
                        <button
                            className="gemma4-close-btn"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="gemma4-messages-container">
                        {messages.map((m, idx) => (
                            <div key={idx} className={`gemma4-msg ${m.role}`}>
                                <div className="gemma4-msg-content">{m.content}</div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="gemma4-msg assistant">
                                <div className="gemma4-msg-content gemma4-thinking">
                                    <span>Gemma 4 is thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="gemma4-input-form" onSubmit={handleSend}>
                        <input
                            type="text"
                            placeholder="Ask Gemma 4 for recommendations or screen modes..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()}>
                            ➤
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
