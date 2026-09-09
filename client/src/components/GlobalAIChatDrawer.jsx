import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../context/AlertContext';
import { useCopilot } from '../context/CopilotContext';
import { chatAPI, transactionsAPI } from '../services/api';
import {
    Bot,
    Send,
    Mic,
    MicOff,
    Loader2,
    X,
    Minimize2,
    Maximize2,
    CheckCircle2,
    Sparkles,
    RotateCcw
} from 'lucide-react';
import './GlobalAIChatDrawer.css';

export default function GlobalAIChatDrawer() {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const { isChatOpen: isOpen, closeChat } = useCopilot();

    // Persist docked state in localStorage
    const [isDocked, setIsDocked] = useState(() => {
        return localStorage.getItem('ai_assistant_docked') !== 'false';
    });

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);

    const messagesEndRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            loadMessages();
        }
    }, [isOpen]);

    useEffect(() => {
        localStorage.setItem('ai_assistant_docked', isDocked);
    }, [isDocked]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const loadMessages = async () => {
        try {
            const response = await chatAPI.getMessages();
            if (response.data && response.data.data) {
                setMessages(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load chat messages:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const renderFormattedMessage = (content) => {
        if (!content) return null;
        const lines = String(content).split('\n');
        return (
            <div className="ai-natural-text" style={{ lineHeight: 1.65, fontSize: '0.92rem' }}>
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
                            <div key={lIdx} style={{ fontWeight: 800, fontSize: '1rem', margin: '6px 0 3px', color: '#fff' }}>
                                {parts.length > 0 ? parts : cleanLine}
                            </div>
                        );
                    }

                    if (isBullet) {
                        return (
                            <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, margin: '2px 0' }}>
                                <span style={{ color: '#ff5a36', fontSize: '0.85rem', lineHeight: 1.6 }}>•</span>
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

    const navigate = useNavigate();
    const location = useLocation();
    const { openModalWithData } = useCopilot();

    // Copilot Action Dispatcher: translates AI intent into UI actions (navigation, modal open, auto-fill)
    const executeCopilotAction = (aiData, userPrompt = '') => {
        // Normalize text: remove Arabic diacritics, unify alef variants (أ إ آ -> ا), unify ى -> ي, and replace ة with ه
        const normalize = (str) => (str || '')
            .toLowerCase()
            .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
            .replace(/[أإآ]/g, 'ا')
            .replace(/ى/g, 'ي')
            .replace(/ة/g, 'ه');

        const promptText = normalize(userPrompt);
        const responseText = normalize(aiData?.content || aiData?.aiResponse?.content || '');
        const fullText = `${promptText} ${responseText}`;
        const extracted = aiData?.extractedData;

        // 1. Explicit AI Command (from audio or function tools)
        if (extracted && extracted.action === 'CREATE_TRANSACTION') {
            openModalWithData('ADD_TRANSACTION', extracted.params);
            return;
        }

        // 2. Intelligent Natural Language UI Intent Detection
        // Open Add Transaction modal
        if (
            promptText.includes('سجل مصروف') || 
            promptText.includes('اضف مصروف') || 
            promptText.includes('سجل دفعه') || 
            promptText.includes('اضف دفعه') ||
            promptText.includes('سجل معامله') ||
            promptText.includes('add transaction') || 
            promptText.includes('add expense') ||
            promptText.includes('new transaction') ||
            (promptText.includes('فتح') && promptText.includes('معامله'))
        ) {
            if (extracted?.params) {
                openModalWithData('ADD_TRANSACTION', extracted.params);
            }
        }

        // Open Add Project modal
        if (
            promptText.includes('مشروع جديد') || 
            promptText.includes('اضف مشروع') || 
            promptText.includes('انشئ مشروع') || 
            promptText.includes('create project') || 
            promptText.includes('add project') ||
            promptText.includes('new project')
        ) {
            openModalWithData('ADD_PROJECT', extracted?.params || null);
        }

        // Direct Navigation Commands (instant traversal across tabs)
        // Detects: وديني، روح، افتح، هات، حولني، وريني، خدني، صفحة، قايمة
        const hasNavIntent = (targetTerms) => {
            const navVerbs = ['وديني', 'روح', 'افتح', 'هات', 'حولني', 'وريني', 'خدني', 'انتقل', 'عرض', 'صفحه', 'قايمه', 'go to', 'open', 'take me', 'navigate', 'show'];
            const targetMatched = targetTerms.some(term => promptText.includes(normalize(term)));
            if (!targetMatched) return false;
            
            // If prompt is short and directly names the section or contains any nav verb
            const hasVerb = navVerbs.some(v => promptText.includes(normalize(v)));
            const isDirectMention = promptText.length < 25;
            return hasVerb || isDirectMention;
        };

        if (hasNavIntent(['مشاريع', 'المشاريع', 'projects'])) {
            navigate('/projects');
        } else if (hasNavIntent(['حسابات', 'الحسابات', 'ماليه', 'الماليه', 'مصاريف', 'المصاريف', 'معاملات', 'المعاملات', 'finance', 'accounting'])) {
            navigate('/finance');
        } else if (hasNavIntent(['مخزن', 'المخزن', 'مستودع', 'المستودع', 'خامات', 'الخامات', 'بضاعه', 'البضاعه', 'inventory'])) {
            navigate('/inventory');
        } else if (hasNavIntent(['عماله', 'العماله', 'عمال', 'العمال', 'صنايعيه', 'الصنايعيه', 'workforce', 'labor'])) {
            navigate('/workforce');
        } else if (hasNavIntent(['عملاء', 'العملاء', 'زبائن', 'الزبائن', 'clients', 'customers'])) {
            navigate('/clients');
        } else if (hasNavIntent(['موردين', 'الموردين', 'suppliers', 'vendors'])) {
            navigate('/suppliers');
        } else if (hasNavIntent(['تقارير', 'التقارير', 'reports'])) {
            navigate('/reports');
        } else if (hasNavIntent(['فواتير', 'الفواتير', 'فاتوره', 'invoices', 'invoice'])) {
            navigate('/invoices');
        } else if (hasNavIntent(['تقارير يوميه', 'تقرير يومي', 'الموقع', 'dsr', 'daily reports'])) {
            navigate('/dsr');
        } else if (hasNavIntent(['مطابقه', 'البنك', 'كشف حساب', 'reconcile', 'bank'])) {
            navigate('/reconcile');
        } else if (hasNavIntent(['مسودات', 'المسودات', 'drafts'])) {
            navigate('/drafts');
        } else if (hasNavIntent(['رئيسيه', 'الرئيسيه', 'لوحه التحكم', 'داشبورد', 'dashboard', 'home'])) {
            navigate('/dashboard');
        }
    };

    const handleSendText = async (e) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || loading) return;

        const textToSend = inputText.trim();
        const userMessage = {
            content: textToSend,
            messageType: 'TEXT',
            createdAt: new Date().toISOString(),
            isUser: true
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setLoading(true);

        // Immediate Client-Side Navigation for instant response without waiting for slow LLM
        executeCopilotAction(null, textToSend);

        try {
            const response = await chatAPI.sendMessage(textToSend);
            const aiData = response.data.data;
            const aiMessage = {
                id: aiData.aiResponse?.id || Date.now().toString(),
                content: aiData.aiResponse?.content || aiData.content || (t('chat.assistantRole') || 'تمام، تم تنفيذ طلبك.'),
                messageType: aiData.aiResponse?.messageType || 'TEXT',
                extractedData: aiData.extractedData || null,
                createdAt: aiData.aiResponse?.createdAt || new Date().toISOString(),
                isUser: false
            };

            setMessages(prev => [...prev, aiMessage]);
            executeCopilotAction(aiData, textToSend);
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

            const aiMessage = {
                id: aiData.aiResponse?.id || Date.now().toString(),
                content: aiData.aiResponse?.content || aiData.content || (t('chat.assistantRole') || 'تمام، تم تنفيذ طلبك.'),
                messageType: aiData.aiResponse?.messageType || 'TEXT',
                extractedData: aiData.extractedData || null,
                createdAt: aiData.aiResponse?.createdAt || new Date().toISOString(),
                isUser: false
            };

            setMessages(prev => {
                const filtered = prev.filter(m => m !== userPlaceholder);
                return [
                    ...filtered,
                    { content: aiData.transcript || 'صوت', messageType: 'TEXT', isUser: true, createdAt: new Date().toISOString() },
                    aiMessage
                ];
            });
            executeCopilotAction(aiData, aiData.transcript || '');
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
                await transactionsAPI.createV2(actionData.params);
                setMessages(prev => prev.map(m =>
                    m.id === msgId ? { ...m, isActionCompleted: true, content: t('chat.successExpense') || '✅ تمام، سجلت المصروف بنجاح!' } : m
                ));
                showAlert({
                    type: 'success',
                    title: t('common.success') || 'Success',
                    message: t('chat.successExpense') || 'Transaction recorded successfully!'
                });
            }
        } catch (error) {
            console.error('Action confirmation failed:', error);
            showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: t('chat.failAction') || 'Failed to execute action. Please check data.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClearChat = () => {
        if (messages.length === 0) return;

        showAlert({
            type: 'warning',
            title: t('chat.newChat') || 'بدء محادثة جديدة',
            message: t('chat.confirmClear') || 'هل أنت متأكد أنك تريد مسح المحادثة الحالية وبدء محادثة جديدة؟',
            confirmText: t('common.confirm') || 'نعم، ابدأ من جديد',
            cancelText: t('common.cancel') || 'إلغاء',
            showCancel: true,
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await chatAPI.clearHistory();
                    setMessages([]);
                } catch (error) {
                    console.error('Failed to clear chat history:', error);
                    setMessages([]);
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
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
            showAlert({
                type: 'error',
                title: t('common.error') || 'Error',
                message: 'Could not access microphone. Please check permissions.'
            });
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
        <>
            {/* Persistent Side Drawer / Window */}
            {isOpen && (
                <aside
                    className={`ai-chat-drawer ${isDocked ? 'ai-drawer-docked' : 'ai-drawer-floating'}`}
                >
                    {/* Header */}
                    <div className="ai-drawer-header">
                        <div className="ai-drawer-title">
                            <div className="ai-avatar-badge">
                                <Bot size={18} />
                            </div>
                            <div className="ai-title-text">
                                <h4>{t('chat.title') || 'AI Assistant'}</h4>
                                <span>{t('chat.assistantRole') || 'Engineering & Finance Copilot'}</span>
                            </div>
                        </div>

                        <div className="ai-drawer-controls">
                            <button
                                className="ai-control-btn"
                                onClick={handleClearChat}
                                title={t('chat.newChat') || 'New Conversation / Reset'}
                            >
                                <RotateCcw size={15} />
                            </button>
                            <button
                                className="ai-control-btn"
                                onClick={() => setIsDocked(!isDocked)}
                                title={isDocked ? 'Switch to floating window' : 'Dock to side'}
                            >
                                {isDocked ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                            </button>
                            <button
                                className="ai-control-btn ai-close-btn"
                                onClick={closeChat}
                                title="Minimize / Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div className="ai-drawer-messages">
                        {messages.length === 0 ? (
                            <div className="ai-empty-state">
                                <div className="ai-empty-icon-wrap">
                                    <Bot size={36} />
                                </div>
                                <h5>{t('chat.startConversation') || 'How can I assist you today?'}</h5>
                                <p>
                                    {t('chat.helpText') || 'You can tell me expenses by voice or text (e.g. "سجلت 5000 خرسانة لمشروع سكن مصر"), ask project balances, or check safe funds.'}
                                </p>
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`ai-msg ${message.isUser ? 'ai-msg-user' : 'ai-msg-bot'}`}
                                >
                                    <div className="ai-msg-bubble">
                                        {renderFormattedMessage(message.content)}

                                        {/* Action Card for AI Commands */}
                                        {message.extractedData?.params && !message.isActionCompleted && (
                                            <div className="ai-action-card">
                                                <div className="ai-action-header">
                                                    <Sparkles size={14} />
                                                    <span>{t('chat.confirmExpense') || 'Confirm Transaction'}</span>
                                                </div>
                                                <div className="ai-action-details">
                                                    {message.extractedData.params.itemName && (
                                                        <div className="ai-action-row">
                                                            <span className="ai-action-k">{t('chat.itemLabel') || 'Item'}:</span>
                                                            <span className="ai-action-v">{message.extractedData.params.itemName}</span>
                                                        </div>
                                                    )}
                                                    {message.extractedData.params.amount && (
                                                        <div className="ai-action-row">
                                                            <span className="ai-action-k">{t('chat.amountLabel') || 'Amount'}:</span>
                                                            <span className="ai-action-v bold-amt">{Number(message.extractedData.params.amount).toLocaleString()} EGP</span>
                                                        </div>
                                                    )}
                                                    {message.extractedData.params.category && (
                                                        <div className="ai-action-row">
                                                            <span className="ai-action-k">{t('chat.bandLabel') || 'Category'}:</span>
                                                            <span className="ai-action-v">{message.extractedData.params.category}</span>
                                                        </div>
                                                    )}
                                                    {message.extractedData.params.projectName && (
                                                        <div className="ai-action-row">
                                                            <span className="ai-action-k">{t('chat.projectLabel') || 'Project'}:</span>
                                                            <span className="ai-action-v">{message.extractedData.params.projectName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    className="ai-btn-confirm-action"
                                                    onClick={() => handleConfirmAction(message.id, message.extractedData)}
                                                    disabled={loading}
                                                >
                                                    <CheckCircle2 size={16} />
                                                    <span>{t('common.confirm') || 'Confirm & Save'}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <span className="ai-msg-time">
                                        {new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Footer */}
                    <form className="ai-drawer-input-form" onSubmit={handleSendText}>
                        <div className="ai-input-wrap">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={t('chat.inputPlaceholder') || 'Ask or record a transaction...'}
                                disabled={loading || recording}
                            />

                            <button
                                type="button"
                                className={`ai-mic-btn ${recording ? 'recording' : ''}`}
                                onClick={recording ? stopRecording : startRecording}
                                title={recording ? 'Stop Recording' : 'Voice Input'}
                            >
                                {recording ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>

                            <button
                                type="submit"
                                className="ai-send-btn"
                                disabled={!inputText.trim() || loading}
                                title="Send Message"
                            >
                                {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                            </button>
                        </div>
                    </form>
                </aside>
            )}
        </>
    );
}
