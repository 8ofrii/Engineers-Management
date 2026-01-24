import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mic, Send, Trash2, StopCircle } from 'lucide-react';
import api from '../services/api';
import Layout from '../components/Layout';
import './ChatAssistant.css';

export default function ChatAssistant() {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load chat history on mount
    useEffect(() => {
        loadChatHistory();
    }, []);

    const loadChatHistory = async () => {
        try {
            const { data } = await api.get('/chat/history');
            setMessages(data.data);
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    };

    // Start recording from microphone
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            mediaRecorderRef.current = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });

            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendVoiceMessage(audioBlob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Microphone access denied:', error);
            alert('Please allow microphone access to use voice input');
        }
    };

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    // Send voice message to backend
    const sendVoiceMessage = async (audioBlob) => {
        setIsProcessing(true);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice.webm');

            const { data } = await api.post('/chat/message', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Add both user message and AI response to chat
            setMessages(prev => [
                ...prev,
                {
                    id: data.data.userMessage.id,
                    content: data.data.userMessage.content,
                    isUser: true,
                    transcribed: true,
                    createdAt: data.data.userMessage.createdAt
                },
                {
                    id: data.data.aiResponse.id,
                    content: data.data.aiResponse.content,
                    isUser: false,
                    createdAt: data.data.aiResponse.createdAt
                }
            ]);

        } catch (error) {
            console.error('Failed to send voice message:', error);
            alert('Failed to process voice message. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Send text message
    const sendTextMessage = async (e) => {
        e.preventDefault();

        if (!inputMessage.trim()) return;

        setIsProcessing(true);

        try {
            const { data } = await api.post('/chat/message', {
                message: inputMessage
            });

            setMessages(prev => [
                ...prev,
                {
                    id: data.data.userMessage.id,
                    content: data.data.userMessage.content,
                    isUser: true,
                    transcribed: false,
                    createdAt: data.data.userMessage.createdAt
                },
                {
                    id: data.data.aiResponse.id,
                    content: data.data.aiResponse.content,
                    isUser: false,
                    createdAt: data.data.aiResponse.createdAt
                }
            ]);

            setInputMessage('');

        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Clear chat history
    const clearHistory = async () => {
        if (!confirm('Are you sure you want to clear all chat history?')) return;

        try {
            await api.delete('/chat/history');
            setMessages([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    };

    // Format recording time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Layout>
            <div className="chat-assistant">
                <div className="chat-header">
                    <h1>Chat Assistant</h1>
                    <p>I can help you add transactions, projects, clients, and suppliers. Just type or speak your request!</p>
                    {messages.length > 0 && (
                        <button className="clear-btn" onClick={clearHistory}>
                            <Trash2 size={16} />
                            Clear History
                        </button>
                    )}
                </div>

                <div className="chat-messages">
                    {messages.length === 0 ? (
                        <div className="chat-empty">
                            <div className="chat-icon">💬</div>
                            <h2>Start a Conversation</h2>
                            <p>I can help you add transactions, projects, clients, and suppliers. Just type or speak your request!</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`message ${msg.isUser ? 'message-user' : 'message-ai'}`}
                            >
                                <div className="message-content">
                                    {msg.transcribed && (
                                        <span className="transcribed-badge">🎤 Transcribed</span>
                                    )}
                                    <p>{msg.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                    {isProcessing && (
                        <div className="message message-ai">
                            <div className="message-content">
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-container">
                    {isRecording ? (
                        <div className="recording-indicator">
                            <div className="recording-animation">
                                <div className="pulse"></div>
                                <Mic size={24} />
                            </div>
                            <span className="recording-time">{formatTime(recordingTime)}</span>
                            <button
                                className="stop-recording-btn"
                                onClick={stopRecording}
                            >
                                <StopCircle size={24} />
                                Stop Recording
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={sendTextMessage} className="chat-input-form">
                            <input
                                type="text"
                                placeholder="Type your message or use voice..."
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                disabled={isProcessing}
                                className="chat-input"
                            />
                            <button
                                type="button"
                                className="voice-btn"
                                onClick={startRecording}
                                disabled={isProcessing}
                                title="Record voice message"
                            >
                                <Mic size={20} />
                            </button>
                            <button
                                type="submit"
                                className="send-btn"
                                disabled={!inputMessage.trim() || isProcessing}
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    )}
                </div>

                {/* Tips section */}
                <div className="chat-tips">
                    <h3>Tips</h3>
                    <ul>
                        <li>🎤 Click the microphone to record your voice</li>
                        <li>💬 Or type your message in Arabic or English</li>
                        <li>📝 Ask me to add expenses, check projects, or view reports</li>
                    </ul>
                </div>
            </div>
        </Layout>
    );
}
