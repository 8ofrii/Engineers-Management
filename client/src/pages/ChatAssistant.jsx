import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useTranslation } from 'react-i18next';
import { Mic, Send, Trash2, StopCircle, Sparkles, ArrowRight, Globe } from 'lucide-react';
import api, { aiExtractAPI } from '../services/api';
import Layout from '../components/Layout';
import './ChatAssistant.css';

export default function ChatAssistant() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { showAlert } = useAlert();
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
            showAlert({ type: 'error', title: t('common.error', 'Error'), message: t('chat.micError') });
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

    // Send voice message — routes to the AI draft pipeline (Phase 7) so the
    // engineer ends up with a real reviewable TransactionDraft, not just an
    // inline AI summary that vanishes. Text messages still go to /chat/message
    // for Q&A.
    const sendVoiceMessage = async (audioBlob) => {
        setIsProcessing(true);

        try {
            const r = await aiExtractAPI.voice(audioBlob);
            const draft = r.data.draft;
            const md = draft.matchedDraft || {};

            // Show transcript as the user's message + an AI summary card with
            // a link to open the draft for review.
            setMessages(prev => [
                ...prev,
                {
                    id: `transcript-${draft.id}`,
                    content: draft.transcript || 'Voice note',
                    isUser: true,
                    transcribed: true,
                    createdAt: draft.createdAt
                },
                {
                    id: `summary-${draft.id}`,
                    content: '',
                    isUser: false,
                    createdAt: draft.createdAt,
                    draftCard: {
                        id: draft.id,
                        amount: md.amount,
                        category: md.category,
                        description: md.description,
                        confidence: draft.confidence
                    }
                }
            ]);
        } catch (error) {
            console.error('Failed to send voice message:', error);
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: error.response?.data?.message || t('chat.error')
            });
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
            // Send the last few turns so the assistant has context across
            // messages. Only plain text content — skip draftCard messages
            // (those are visual UI only, not conversational turns).
            const history = messages
                .filter(m => m.content && !m.draftCard)
                .slice(-10)
                .map(m => ({
                    role: m.isUser ? 'user' : 'assistant',
                    content: String(m.content).slice(0, 2000)
                }));

            const { data } = await api.post('/chat/message', {
                message: inputMessage,
                history
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
            showAlert({
                type: 'error',
                title: t('common.error', 'Error'),
                message: error.response?.data?.message || t('chat.error')
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Clear chat history
    const clearHistory = async () => {
        showAlert({
            type: 'warning',
            title: t('common.confirm', 'Confirm'),
            message: t('chat.confirmClear'),
            showCancel: true,
            onConfirm: async () => {
                try {
                    await api.delete('/chat/history');
                    setMessages([]);
                } catch (error) {
                    console.error('Failed to clear history:', error);
                }
            }
        });
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
                    <div>
                        <h1>{t('chat.title')}</h1>
                        <p>{t('chat.helpText')}</p>
                    </div>
                    <div className="chat-header-actions">
                        <button 
                            className="clear-btn" 
                            style={{ position: 'static' }} 
                            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
                        >
                            <Globe size={16} />
                            {i18n.language === 'en' ? 'عربي' : 'English'}
                        </button>
                        {messages.length > 0 && (
                            <button className="clear-btn" style={{ position: 'static' }} onClick={clearHistory}>
                                <Trash2 size={16} />
                                {t('chat.clearHistory')}
                            </button>
                        )}
                    </div>
                </div>

                <div className="chat-messages">
                    {messages.length === 0 ? (
                        <div className="chat-empty">
                            <div className="chat-icon">💬</div>
                            <h2>{t('chat.startConversation')}</h2>
                            <p>{t('chat.helpText')}</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`message ${msg.isUser ? 'message-user' : 'message-ai'}`}
                            >
                                <div className="message-content">
                                    {msg.transcribed && (
                                        <span className="transcribed-badge">🎤 {t('chat.transcribed')}</span>
                                    )}
                                    {msg.content && <p>{msg.content}</p>}
                                    {msg.draftCard && (
                                        <Link
                                            to={`/drafts/${msg.draftCard.id}`}
                                            style={{
                                                display: 'block',
                                                background: 'rgba(37, 99, 235, 0.08)',
                                                border: '1px solid rgba(37, 99, 235, 0.25)',
                                                padding: 12,
                                                borderRadius: 10,
                                                textDecoration: 'none',
                                                color: 'inherit',
                                                marginTop: 4
                                            }}
                                        >
                                            <div className="flex gap-sm" style={{ alignItems: 'center', marginBottom: 4 }}>
                                                <Sparkles size={14} />
                                                <strong>{t('drafts.created', 'AI draft created')}</strong>
                                                <span style={{ fontSize: '0.7rem', opacity: 0.7, marginInlineStart: 'auto' }}>
                                                    {msg.draftCard.confidence || 'medium'} confidence
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', marginBottom: 4 }}>
                                                {msg.draftCard.description || '(no summary)'}
                                            </div>
                                            <div className="flex gap-sm" style={{ fontSize: '0.85rem', opacity: 0.85, alignItems: 'center' }}>
                                                <span>
                                                    {msg.draftCard.amount != null ? `${msg.draftCard.amount} EGP` : '—'}
                                                    {msg.draftCard.category ? ` · ${msg.draftCard.category}` : ''}
                                                </span>
                                                <ArrowRight size={14} style={{ marginInlineStart: 'auto' }} />
                                                <span style={{ fontWeight: 600 }}>{t('drafts.review', 'Review draft')}</span>
                                            </div>
                                        </Link>
                                    )}
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
                                {t('chat.stopRecording')}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={sendTextMessage} className="chat-input-form">
                            <input
                                type="text"
                                placeholder={t('chat.typeMessage')}
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
                                title={t('chat.recordVoice')}
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
                    <h3>{t('chat.tips')}</h3>
                    <ul>
                        <li>🎤 {t('chat.tipMic')}</li>
                        <li>💬 {t('chat.tipLang')}</li>
                        <li>📝 {t('chat.tipExamples')}</li>
                    </ul>
                </div>
            </div>
        </Layout>
    );
}
