import React, { useState, useRef, useEffect } from "react";
import config from "../config";

function ChatBox() {
    const [unlocked, setUnlocked] = useState(false);
    const [secretKey, setSecretKey] = useState("");
    const [keyError, setKeyError] = useState("");
    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    function handleUnlock() {
        if (!secretKey.trim()) {
            setKeyError("Please enter the secret key.");
            return;
        }
        // We validate the key by attempting a real request
        // A 403 means wrong key, 200 means correct
        setLoading(true);
        fetch(`${config.apiUrl}/ask`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": config.apiKey,
            },
            body: JSON.stringify({
                secret_key: secretKey,
                question: "How many rounds are in the dataset?",
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setLoading(false);
                if (data.error && data.error.includes("Invalid secret key")) {
                    setKeyError("Invalid secret key. Please try again.");
                } else {
                    setUnlocked(true);
                    setMessages([
                        {
                            role: "assistant",
                            text: data.answer ||
                                "Chat unlocked. Ask me anything about your disc golf stats!",
                        },
                    ]);
                }
            })
            .catch((err) => {
                setLoading(false);
                setKeyError("Connection error. Please try again.");
            });
    }

    function handleAsk() {
        if (!question.trim() || loading) return;

        const userMessage = { role: "user", text: question };
        setMessages((prev) => [...prev, userMessage]);
        setQuestion("");
        setLoading(true);

        fetch(`${config.apiUrl}/ask`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": config.apiKey,
            },
            body: JSON.stringify({
                secret_key: secretKey,
                question: question,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setLoading(false);
                if (data.error) {
                    setMessages((prev) => [
                        ...prev,
                        { role: "assistant", text: `Error: ${data.error}` },
                    ]);
                } else {
                    setMessages((prev) => [
                        ...prev,
                        { role: "assistant", text: data.answer },
                    ]);
                }
            })
            .catch((err) => {
                setLoading(false);
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", text: "Connection error. Please try again." },
                ]);
            });
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (unlocked) {
                handleAsk();
            } else {
                handleUnlock();
            }
        }
    }

    if (!unlocked) {
        return (
            <div className="card chatbox">
                <h2>Ask About Your Stats</h2>
                <p className="chat-intro">
                    Enter the secret key to unlock the AI assistant.
                </p>
                <div className="unlock-form">
                    <input
                        type="password"
                        placeholder="Secret key..."
                        value={secretKey}
                        onChange={(e) => setSecretKey(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="chat-input"
                    />
                    <button
                        onClick={handleUnlock}
                        disabled={loading}
                        className="send-button"
                    >
                        {loading ? "Checking..." : "Unlock"}
                    </button>
                </div>
                {keyError && <p className="error-text">{keyError}</p>}
            </div>
        );
    }

    return (
        <div className="card chatbox">
            <h2>Ask About Your Stats</h2>
            <div className="messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        <span className="message-label">
                            {msg.role === "user" ? "You" : "Agent"}
                        </span>
                        <p className="message-text">{msg.text}</p>
                    </div>
                ))}
                {loading && (
                    <div className="message assistant">
                        <span className="message-label">Agent</span>
                        <p className="message-text thinking">Thinking...</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-form">
                <input
                    type="text"
                    placeholder="Ask a question about your disc golf stats..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="chat-input"
                    disabled={loading}
                />
                <button
                    onClick={handleAsk}
                    disabled={loading || !question.trim()}
                    className="send-button"
                >
                    {loading ? "..." : "Ask"}
                </button>
            </div>
        </div>
    );
}

export default ChatBox;