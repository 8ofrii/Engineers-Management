import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../context/AlertContext';
import { chatAPI, transactionsAPI } from '../services/api';
import { MessageSquare, Send, Mic, MicOff, Loader } from 'lucide-react';
import Layout from '../components/Layout';
import './Chat.css';

export default function Chat() {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const messagesEndRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        loadMessages();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadMessages = async () => {
        try {
            const response = await chatAPI.getMessages();
            setMessages(response.data.data.reverse());
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const renderFormattedMessage = (content) => {
        if (!content) return null;
        const lines = String(content).split('\n');
        return (
            <div className="ai-natural-text" style={{ lineHeight: 1.65, fontSize: '0.95rem' }}>
                {lines.map((line, lIdx) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <div key={lIdx} style={{ height: '6px' }} />;
                    
                    const isHeader = trimmed.startsWith('#');
                    const cleanLine = trimmed.replace(/^#+\s*/, '');
                    
                    const isBullet = /^[*-•]\s+/.test(cleanLine);
                    const bulletText = isBullet ? cleanLine.replace(/^[*-•]\s+/, '') : cleanLine;
                    
                    const parts = [];
                    const boldRegex = /\*\*(.*?)\*\*|\*(.*?)\*/g;
                    let lastIndex = 0;
                    let match;
                    
                    while ((match = boldRegex.exec(bulletText)) !== null) {
                        if (match.index > lastIndex) {
                            parts.push(bulletText.substring(lastIndex, match.index));
                        }
                        parts.push(
                            <strong key={match.index} style={{ fontWeight: 700, color: 'inherit' }}>
                                {match[1] || match[2]}
                            </strong>
                        );
                        lastIndex = match.index + match[0].length;
                    }
                    if (lastIndex < bulletText.length) {
                        parts.push(bulletText.substring(lastIndex));
                    }

                    if (isHeader) {
                        return (
                            <div key={lIdx} style={{ fontWeight: 800, fontSize: '1.05rem', margin: '6px 0 3px', color: '#fff' }}>
                                {parts.length > 0 ? parts : cleanLine}
                            </div>
                        );
                    }

                    if (isBullet) {
                        return (
                            <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, margin: '2px 0' }}>
                                <span style={{ color: '#ff5a36', fontSize: '0.9rem', lineHeight: 1.6 }}>•</span>
                                <span style={{ flex: 1 }}>{parts.length > 0 ? parts : bulletText}</span>
                            </div>
                        );
                    }

                    return (
                        <p key={lIdx} style={{ margin: '0 0 4px 0' }}>
                            {parts.length > 0 ? parts : cleanLine}
                        </p>
                    );
                })}
            </div>
        );
    };

    const handleSendText = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || loading) return;

        const userMessage = {
            content: inputText,
            messageType: 'TEXT',
            createdAt: new Date().toISOString(),
            isUser: true
        };

        setMessages(prev => [...prev, userMessage]);
        const textToSend = inputText;
        setInputText('');
        setLoading(true);

        try {
            const response = await chatAPI.sendMessage(textToSend);
            const aiData = response.data.data;
            setMessages(prev => [...prev, { ...aiData, isUser: false }]);
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => [
                ...prev,
                {
                    content: t('chat.generalError') || 'عذراً، حصل مشكلة فنية. جرب تاني كمان شوية.',
                    messageType: 'TEXT',
                    createdAt: new Date().toISOString(),
                    isUser: false
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const sendAudioMessage = async (audioBlob) => {
        setLoading(true);

        // Placeholder for user message while processing
        const userPlaceholder = {
            content: t('chat.processingAudio') || 'جاري معالجة الصوت...',
            messageType: 'TEXT',
            createdAt: new Date().toISOString(),
            isUser: true
        };
        setMessages(prev => [...prev, userPlaceholder]);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await chatAPI.sendMessage(formData, true);
            const aiData = response.data.data;

            // Remove placeholder and add real transcribed message + AI response
            setMessages(prev => {
                const filtered = prev.filter(m => m !== userPlaceholder);
                return [
                    ...filtered,
                    { content: aiData.transcript, messageType: 'TEXT', isUser: true, createdAt: new Date().toISOString() },
                    { ...aiData, isUser: false }
                ];
            });
        } catch (error) {
            console.error('Failed to send audio:', error);
            setMessages(prev => [
                ...prev,
                {
                    content: t('chat.audioError') || 'مقدرتش أفهم الصوت، ممكن يكون فيه دوشة كتير. جرب تسجل تاني.',
                    messageType: 'TEXT',
                    createdAt: new Date().toISOString(),
                    isUser: false
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmAction = async (msgId, actionData) => {
        try {
            setLoading(true);
            if (actionData.action === 'CREATE_TRANSACTION') {
                await transactionsAPI.create(actionData.params);
                // Update message internally to show completed
                setMessages(prev => prev.map(m =>
                    m.id === msgId ? { ...m, isActionCompleted: true, content: t('chat.successExpense') || '✅ تمام، سجلت المصروف بنجاح!' } : m
                ));
            }
        } catch (error) {
            console.error('Action confirmation failed:', error);
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: t('chat.failAction') || 'فشل في تنفيذ العملية. تأكد من البيانات.' });
        } finally {
            setLoading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendAudioMessage(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setRecording(true);
        } catch (error) {
            console.error('Failed to start recording:', error);
            showAlert({ type: 'error', title: t('common.error') || 'Error', message: 'Could not access microphone. Please check permissions.' });
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && recording) {
            mediaRecorder.stop();
            setRecording(false);
            setMediaRecorder(null);
        }
    };

    return (
        <Layout>
            <div className="chat-page">
                <div className="chat-header">
                    <h1>
                        <MessageSquare size={32} />
                        {t('chat.title')}
                    </h1>
                    <p>{t('chat.subtitle')}</p>
                </div>

                <div className="chat-container card">
                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <div className="chat-empty">
                                <MessageSquare size={64} />
                                <h3>{t('chat.startConversation')}</h3>
                                <p>{t('chat.helpText')}</p>
                            </div>
                        ) : (
                            <>
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`message ${message.isUser ? 'message-user' : 'message-bot'}`}
                                    >
                                        <div className="message-content">
                                            {renderFormattedMessage(message.content)}

                                            {/* Action Card for AI Commands */}
                                            {message.extractedData?.params && !message.isActionCompleted && (
                                                <div className="action-card">
                                                    <div className="action-header">
                                                        {message.extractedData?.action === 'CREATE_TRANSACTION' ? (t('chat.confirmExpense') || 'تأكيد تسجيل مصروف') : (t('chat.proposedAction') || 'إجراء مقترح')}
                                                    </div>
                                                    <div className="action-details">
                                                        {message.extractedData.params.itemName && (
                                                            <>
                                                                <span className="action-label">{t('chat.itemLabel') || 'الصنف:'}</span>
                                                                <span className="action-value">
                                                                    {message.extractedData.params.itemName}
                                                                    {message.extractedData.params.isStockPurchase &&
                                                                        <span className="badge badge-info ml-xs" style={{ fontSize: '10px' }}>{t('chat.stock') || 'مخزن'}</span>
                                                                    }
                                                                </span>
                                                            </>
                                                        )}
                                                        {message.extractedData.params.quantity && (
                                                            <>
                                                                <span className="action-label">{t('chat.qtyLabel') || 'الكمية:'}</span>
                                                                <span className="action-value">{message.extractedData.params.quantity} {message.extractedData.params.unit}</span>
                                                            </>
                                                        )}
                                                        {message.extractedData.params.amount && (
                                                            <>
                                                                <span className="action-label">{t('chat.amountLabel') || 'المبلغ:'}</span>
                                                                <span className="action-value">{message.extractedData.params.amount} {t('chat.currency') || 'ج.م'}</span>
                                                            </>
                                                        )}
                                                        {message.extractedData.params.category && (
                                                            <>
                                                                <span className="action-label">{t('chat.bandLabel') || 'البند:'}</span>
                                                                <span className="action-value">{message.extractedData.params.category}</span>
                                                            </>
                                                        )}
                                                        {message.extractedData.params.projectName && (
                                                            <>
                                                                <span className="action-label">{t('chat.projectLabel') || 'المشروع:'}</span>
                                                                <span className="action-value">{message.extractedData.params.projectName}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn-confirm"
                                                            onClick={() => handleConfirmAction(message.id, message.extractedData)}
                                                            disabled={loading}
                                                        >
                                                            {t('chat.confirmRecord') || 'تأكيد التسجيل'}
                                                        </button>
                                                        <button
                                                            className="btn-cancel"
                                                            onClick={() => setMessages(prev => prev.map(m => m.id === message.id ? { ...m, isActionCompleted: true, content: t('chat.actionCancelled') || 'تم إلغاء العملية.' } : m))}
                                                            disabled={loading}
                                                        >
                                                            {t('chat.cancelLabel') || 'إلغاء'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="message-time">
                                            {new Date(message.createdAt).toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    <div className="chat-input-container">
                        <form onSubmit={handleSendText} className="chat-input-form">
                            <input
                                type="text"
                                className="chat-input"
                                placeholder={t('chat.typeMessage')}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                disabled={loading || recording}
                            />

                            <div className="chat-actions">
                                <button
                                    type="button"
                                    className={`btn-icon ${recording ? 'btn-recording' : ''}`}
                                    onClick={recording ? stopRecording : startRecording}
                                    disabled={loading}
                                    title={recording ? 'Stop recording' : 'Start recording'}
                                >
                                    {recording ? <MicOff size={20} /> : <Mic size={20} />}
                                </button>

                                <button
                                    type="submit"
                                    className="btn-icon btn-send"
                                    disabled={!inputText.trim() || loading || recording}
                                    title="Send message"
                                >
                                    {loading ? <Loader size={20} className="spinner-icon" /> : <Send size={20} />}
                                </button>
                            </div>
                        </form>

                        {recording && (
                            <div className="recording-indicator">
                                <div className="recording-pulse"></div>
                                <span>{t('chat.recording')}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="chat-info card">
                    <h3>{t('chat.tips')}</h3>
                    <ul>
                        <li>{t('chat.tip1')}</li>
                        <li>{t('chat.tip2')}</li>
                        <li>{t('chat.tip3')}</li>
                        <li>{t('chat.tip4')}</li>
                    </ul>
                </div>
            </div>
        </Layout>
    );
}
