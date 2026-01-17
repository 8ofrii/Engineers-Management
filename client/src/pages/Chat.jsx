import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { chatAPI } from '../services/api';
import { MessageSquare, Send, Mic, MicOff, Loader } from 'lucide-react';
import Layout from '../components/Layout';
import './Chat.css';

export default function Chat() {
    const { t } = useTranslation();
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

    const handleSendText = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || loading) return;

        const userMessage = {
            content: inputText,
            messageType: 'text',
            createdAt: new Date().toISOString(),
            isUser: true
        };

        setMessages([...messages, userMessage]);
        setInputText('');
        setLoading(true);

        try {
            const response = await chatAPI.sendText({ content: inputText });
            const botMessage = response.data.data;
            setMessages(prev => [...prev, { ...botMessage, isUser: false }]);
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => [
                ...prev,
                {
                    content: 'Sorry, I encountered an error. Please try again.',
                    messageType: 'text',
                    createdAt: new Date().toISOString(),
                    isUser: false
                }
            ]);
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
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && recording) {
            mediaRecorder.stop();
            setRecording(false);
            setMediaRecorder(null);
        }
    };

    const sendAudioMessage = async (audioBlob) => {
        setLoading(true);

        const userMessage = {
            content: 'Audio message',
            messageType: 'audio',
            createdAt: new Date().toISOString(),
            isUser: true
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await chatAPI.sendAudio(formData);
            const botMessage = response.data.data;
            setMessages(prev => [...prev, { ...botMessage, isUser: false }]);
        } catch (error) {
            console.error('Failed to send audio:', error);
            setMessages(prev => [
                ...prev,
                {
                    content: 'Sorry, I could not process the audio. Please try again.',
                    messageType: 'text',
                    createdAt: new Date().toISOString(),
                    isUser: false
                }
            ]);
        } finally {
            setLoading(false);
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
                                            {message.messageType === 'audio' && message.audioUrl && (
                                                <audio controls src={message.audioUrl} className="message-audio" />
                                            )}
                                            {message.transcript && message.messageType === 'audio' && (
                                                <div className="message-transcript">
                                                    <small>Transcript:</small>
                                                    <p>{message.transcript}</p>
                                                </div>
                                            )}
                                            {message.content && message.messageType === 'text' && (
                                                <p>{message.content}</p>
                                            )}
                                            {message.response && !message.isUser && (
                                                <p className="message-response">{message.response}</p>
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
