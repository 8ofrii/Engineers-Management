import { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    SafeAreaView,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { aiChatApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useFormat } from '../utils/format';

const SUGGESTED_PROMPTS_AR = [
    '📊 ملخص المصروفات والإيرادات',
    '🏢 موقف ميزانيات المشاريع',
    '💰 سجل مصروف 500 جنيه نقل',
    '👷 تقرير نشاط الموقع اليوم'
];

const SUGGESTED_PROMPTS_EN = [
    '📊 Financial summary of all projects',
    '🏢 Active project budget status',
    '💰 Record 500 EGP transport expense',
    '👷 Daily site workforce summary'
];

export default function AIChatScreen({ route, navigation }) {
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const { theme } = useTheme();
    const { currency } = useFormat();

    const projectId = route?.params?.projectId || route?.params?.id;
    const projectName = route?.params?.projectName || route?.params?.name;

    const suggestedList = projectName
        ? (isArabic
            ? [
                `📊 موقف ميزانية ${projectName}`,
                `💰 سجل مصروف لمشروع ${projectName}`,
                `👷 تقرير الموقع لمشروع ${projectName}`,
                `🏢 ملخص الحسابات لمشروع ${projectName}`
            ]
            : [
                `📊 Budget status for ${projectName}`,
                `💰 Record expense for ${projectName}`,
                `👷 Site report for ${projectName}`,
                `🏢 Financial summary for ${projectName}`
            ])
        : (isArabic ? SUGGESTED_PROMPTS_AR : SUGGESTED_PROMPTS_EN);

    const [messages, setMessages] = useState([
        {
            id: 'welcome-1',
            role: 'assistant',
            content: isArabic
                ? (projectName
                    ? `أهلاً بك! تم ضبط المساعد الذكي لمتابعة مشروع: "${projectName}".\nيمكنك سؤالي عن ميزانية المشروع، المصروفات، أو تسجيل القيود مباشرة.`
                    : 'أهلاً بك! أنا المساعد الذكي لنظام حسابي ERP.\nيمكنك سؤالي عن ميزانيات المشاريع، التقارير اليومية، المصروفات، أو تسجيل المعاملات مباشرة بالأوامر النصية والصوتية.')
                : (projectName
                    ? `Hello! AI Copilot is active with context for project: "${projectName}".\nAsk about this project's budget, site logs, or draft transactions directly.`
                    : 'Hello! I am your Hesaby ERP AI Copilot.\nAsk me about project budgets, daily site logs, cashflow, or draft transactions via chat and voice.')
        }
    ]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const scrollRef = useRef();

    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const res = await aiChatApi.history();
            const rawList = res.data?.data || res.data?.history || [];
            if (rawList.length > 0) {
                const formatted = rawList.map((item, idx) => ({
                    id: item.id || `hist-${idx}`,
                    role: item.processed ? 'user' : (item.messageType === 'COMMAND' || item.extractedData ? 'assistant' : (item.role || 'assistant')),
                    content: item.content,
                    extractedData: item.extractedData,
                    createdAt: item.createdAt
                }));
                setMessages(formatted);
            }
        } catch {
            // Keep default welcome message
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages, sending]);

    const handleClearHistory = () => {
        Alert.alert(
            isArabic ? 'مسح المحادثة' : 'Clear Chat History',
            isArabic ? 'هل تريد مسح سجل المحادثات السابقة للمساعد الذكي؟' : 'Are you sure you want to clear your chat history?',
            [
                { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
                {
                    text: isArabic ? 'مسح' : 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await aiChatApi.clear();
                            setMessages([
                                {
                                    id: Date.now().toString(),
                                    role: 'assistant',
                                    content: isArabic
                                        ? 'تم مسح سجل المحادثة. كيف يمكنني مساعدتك اليوم؟'
                                        : 'Chat history cleared. How can I help you today?'
                                }
                            ]);
                        } catch (err) {
                            Alert.alert(isArabic ? 'خطأ' : 'Error', err.message);
                        }
                    }
                }
            ]
        );
    };

    const navigateToTarget = (target, params = {}) => {
        const t = (target || '').toUpperCase();
        if (t === 'DSR' || t === 'REPORTS') {
            navigation.navigate('DSRTab', { screen: 'DSRList', params });
        } else if (t === 'CREATE_DSR' || t === 'NEW_REPORT') {
            navigation.navigate('DSRTab', { screen: 'DSRCreate', params });
        } else if (t === 'FINANCE' || t === 'TRANSACTIONS') {
            navigation.navigate('FinanceTab', { screen: 'FinanceList', params });
        } else if (t === 'ADD_TRANSACTION') {
            navigation.navigate('FinanceTab', { screen: 'AddTransaction', params });
        } else if (t === 'PROJECTS' || t === 'DASHBOARD') {
            navigation.navigate('ProjectsTab', { screen: 'Dashboard', params });
        } else if (t === 'INVENTORY' || t === 'STOCK') {
            navigation.navigate('OperationsTab', { screen: 'Inventory', params });
        } else if (t === 'WORKMEN' || t === 'LABOR') {
            navigation.navigate('OperationsTab', { screen: 'Workmen', params });
        } else if (t === 'INVOICES') {
            navigation.navigate('OperationsTab', { screen: 'Invoices', params });
        } else if (t === 'CLIENTS') {
            navigation.navigate('OperationsTab', { screen: 'Clients', params });
        } else if (t === 'SUPPLIERS') {
            navigation.navigate('OperationsTab', { screen: 'Suppliers', params });
        } else if (t === 'PROFILE') {
            navigation.navigate('ProfileTab', { screen: 'ProfileHome', params });
        }
    };

    const handleSend = async (customText = null) => {
        const textToSend = (customText || input).trim();
        if (!textToSend || sending) return;

        const userMsg = { id: `u-${Date.now()}`, role: 'user', content: textToSend };
        setMessages((prev) => [...prev, userMsg]);
        if (!customText) setInput('');
        setSending(true);

        try {
            const history = messages
                .filter(m => m.content && (m.role === 'user' || m.role === 'assistant'))
                .slice(-10)
                .map(m => ({ role: m.role, content: m.content }));

            const promptWithContext = projectName && !textToSend.includes(projectName)
                ? `${textToSend} (المشروع: ${projectName})`
                : textToSend;

            const res = await aiChatApi.send(promptWithContext, history);
            const aiData = res.data?.data || res.data || {};
            const reply = aiData.aiResponse?.content || aiData.reply || aiData.message || (isArabic ? 'تم استلام طلبك.' : 'Request received.');
            const extracted = aiData.extractedData || null;

            setMessages((prev) => [
                ...prev,
                {
                    id: `a-${Date.now()}`,
                    role: 'assistant',
                    content: reply,
                    extractedData: extracted
                }
            ]);

            // Auto-navigate if navigation action returned
            if (extracted && extracted.action === 'NAVIGATE' && extracted.target) {
                setTimeout(() => {
                    navigateToTarget(extracted.target);
                }, 750);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: `err-${Date.now()}`,
                    role: 'assistant',
                    content: isArabic
                        ? 'عذراً، تعذر الاتصال بالمساعد الذكي في الوقت الحالي. تأكد من اتصال الإنترنت ثم أعد المحاولة.'
                        : 'Sorry, could not reach the AI Copilot. Please check your connection and try again.'
                }
            ]);
        } finally {
            setSending(false);
        }
    };

    const handleActionClick = (extracted) => {
        if (!extracted) return;
        if (extracted.action === 'CREATE_TRANSACTION' && extracted.params) {
            navigation.navigate('FinanceTab', {
                screen: 'AddTransaction',
                params: {
                    type: extracted.params.type || 'EXPENSE',
                    amount: String(extracted.params.amount || ''),
                    category: extracted.params.category || 'MATERIALS',
                    description: extracted.params.description || '',
                    projectId: extracted.params.projectId || null
                }
            });
        } else if (extracted.action === 'NAVIGATE' && extracted.target) {
            navigateToTarget(extracted.target);
        }
    };

    // Determine high-contrast theme-appropriate bubble colors
    const isObsidian = theme.id === 'obsidian-emerald';
    const isGlass = theme.id === 'glass-dark';
    const isLiquid = theme.id === 'liquid-glass';
    const isMonochrome = theme.id === 'monochrome';
    const userBubbleBg = isMonochrome ? theme.cardAlt : (isObsidian ? '#10b981' : (isGlass ? '#38bdf8' : (isLiquid ? '#0284c7' : theme.primary)));
    const userBubbleTextColor = isMonochrome ? theme.text : (isObsidian ? '#000000' : (isGlass ? '#070b14' : '#ffffff'));
    const userBubbleBorderColor = isMonochrome ? theme.borderStrong : userBubbleBg;
    const btnTextColor = isObsidian ? '#000000' : (isGlass ? '#070b14' : (isMonochrome ? '#000000' : '#ffffff'));

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
                    <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="sparkles" size={18} color={theme.primary} />
                        <Text style={[styles.headerTitle, { color: theme.text }]}>
                            {isArabic ? 'المساعد الذكي Copilot' : 'AI Copilot Assistant'}
                        </Text>
                    </View>
                    <Text style={[styles.statusText, { color: theme.success }]}>
                        🟢 {isArabic ? 'متصل وجاهز للاستفسار' : 'Online & Ready'}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleClearHistory} style={styles.clearBtn} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={20} color={theme.subtext} />
                </TouchableOpacity>
            </View>

            {/* Project Context Badge */}
            {projectName ? (
                <View style={[styles.contextBanner, { backgroundColor: theme.primaryLight, borderBottomColor: theme.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="business" size={14} color={theme.primary} />
                    <Text style={[styles.contextBannerText, { color: theme.primary }]} numberOfLines={1}>
                        {isArabic ? `المشروع النشط: ${projectName}` : `Active Project: ${projectName}`}
                    </Text>
                </View>
            ) : null}

            {/* Suggested prompts bar */}
            <View style={[styles.suggestionsBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
                    {suggestedList.map((prompt, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.suggestionChip, { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong }]}
                            onPress={() => handleSend(prompt)}
                            disabled={sending}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.suggestionText, { color: theme.text }]}>{prompt}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Chat message list */}
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.chatScroll}
                showsVerticalScrollIndicator={false}
            >
                {loadingHistory && (
                    <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={theme.primary} />
                    </View>
                )}

                {messages.map((m) => {
                    const isUser = m.role === 'user';
                    return (
                        <View
                            key={m.id}
                            style={[
                                styles.msgBubbleWrapper,
                                { alignItems: isUser ? (isArabic ? 'flex-start' : 'flex-end') : (isArabic ? 'flex-end' : 'flex-start') }
                            ]}
                        >
                            <View
                                style={[
                                    styles.msgBubble,
                                    isUser
                                        ? [styles.userBubble, { backgroundColor: userBubbleBg, borderColor: userBubbleBorderColor, borderWidth: 1 }]
                                        : [styles.assistantBubble, { backgroundColor: theme.card, borderColor: theme.border }]
                                ]}
                            >
                                {!isUser && (
                                    <View style={[styles.assistantHeader, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <Ionicons name="sparkles" size={14} color={theme.primary} />
                                        <Text style={[styles.assistantName, { color: theme.primary }]}>
                                            Hesaby AI
                                        </Text>
                                    </View>
                                )}
                                <Text style={[styles.msgText, { color: isUser ? userBubbleTextColor : theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {m.content}
                                </Text>

                                {/* Action Card: Transaction Proposal */}
                                {m.extractedData && m.extractedData.action === 'CREATE_TRANSACTION' && m.extractedData.params && (
                                    <View style={[styles.actionCard, { backgroundColor: theme.cardAlt, borderColor: theme.primary, [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: theme.primary }]}>
                                        <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={[styles.actionCardTitle, { color: theme.text }]}>
                                                {isArabic ? 'تفاصيل المعاملة المقترحة' : 'Proposed Transaction'}
                                            </Text>
                                            <Text style={[styles.actionCardAmount, { color: theme.primary }]}>
                                                {currency(m.extractedData.params.amount)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.actionCardMeta, { color: theme.subtext, textAlign: isArabic ? 'right' : 'left' }]}>
                                            {isArabic ? 'البند' : 'Category'}: {m.extractedData.params.category} · {m.extractedData.params.description || ''}
                                        </Text>
                                        <TouchableOpacity
                                            style={[styles.actionCardBtn, { backgroundColor: theme.primary, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                                            onPress={() => handleActionClick(m.extractedData)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="create-outline" size={16} color={btnTextColor} />
                                            <Text style={[styles.actionCardBtnText, { color: btnTextColor }]}>
                                                {isArabic ? 'مراجعة وتسجيل المعاملة' : 'Review & Save'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Action Card: Navigation Destination */}
                                {m.extractedData && m.extractedData.action === 'NAVIGATE' && m.extractedData.target && (
                                    <View style={[styles.actionCard, { backgroundColor: theme.cardAlt, borderColor: theme.primary, [isArabic ? 'borderRightWidth' : 'borderLeftWidth']: 4, [isArabic ? 'borderRightColor' : 'borderLeftColor']: theme.primary }]}>
                                        <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons name="compass-outline" size={18} color={theme.primary} />
                                            <Text style={[styles.actionCardTitle, { color: theme.text }]}>
                                                {isArabic ? 'الانتقال إلى الشاشة' : 'Navigate to Destination'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.actionCardBtn, { backgroundColor: theme.primary, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                                            onPress={() => handleActionClick(m.extractedData)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="open-outline" size={16} color={btnTextColor} />
                                            <Text style={[styles.actionCardBtnText, { color: btnTextColor }]}>
                                                {isArabic ? 'فتح الشاشة الآن' : 'Open Screen Now'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    );
                })}

                {sending && (
                    <View style={[styles.msgBubbleWrapper, { alignItems: isArabic ? 'flex-end' : 'flex-start' }]}>
                        <View style={[styles.msgBubble, styles.assistantBubble, { backgroundColor: theme.card, borderColor: theme.border, paddingVertical: 14, paddingHorizontal: 18 }]}>
                            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                                <ActivityIndicator size="small" color={theme.primary} />
                                <Text style={{ color: theme.subtext, fontSize: 13, fontWeight: '600' }}>
                                    {isArabic ? 'جارِ التحليل والإجابة...' : 'Thinking…'}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Input Bar */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                    <TextInput
                        style={[styles.textInput, { backgroundColor: theme.cardAlt, borderColor: theme.borderStrong, color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}
                        placeholder={isArabic ? 'اسأل المساعد الذكي عن أي بيانات أو مشاريع...' : 'Ask AI anything about finance or projects...'}
                        placeholderTextColor={theme.subtext}
                        value={input}
                        onChangeText={setInput}
                        multiline
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendBtn,
                            { backgroundColor: theme.primary },
                            (!input.trim() || sending) && styles.sendDisabled
                        ]}
                        onPress={() => handleSend()}
                        disabled={!input.trim() || sending}
                        activeOpacity={0.8}
                    >
                        <Ionicons name={isArabic ? 'arrow-back' : 'arrow-forward'} size={20} color={theme.isDark ? '#000000' : '#ffffff'} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 36,
        paddingBottom: 12,
        gap: 10,
        borderBottomWidth: 1
    },
    backBtn: {
        padding: 6
    },
    clearBtn: {
        padding: 6
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800'
    },
    statusText: {
        fontSize: 11,
        marginTop: 2,
        fontWeight: '600'
    },
    contextBanner: {
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1
    },
    contextBannerText: {
        fontSize: 12,
        fontWeight: '700'
    },
    suggestionsBar: {
        paddingVertical: 8,
        borderBottomWidth: 1
    },
    suggestionsScroll: {
        paddingHorizontal: 12,
        gap: 8
    },
    suggestionChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1
    },
    suggestionText: {
        fontSize: 12,
        fontWeight: '600'
    },
    chatScroll: {
        padding: 16,
        paddingBottom: 30
    },
    msgBubbleWrapper: {
        width: '100%',
        marginBottom: 14
    },
    msgBubble: {
        maxWidth: '85%',
        padding: 14,
        borderRadius: 18
    },
    userBubble: {
        borderBottomRightRadius: 4
    },
    assistantBubble: {
        borderWidth: 1,
        borderBottomLeftRadius: 4
    },
    assistantHeader: {
        alignItems: 'center',
        gap: 6,
        marginBottom: 6
    },
    assistantName: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase'
    },
    msgText: {
        fontSize: 14,
        lineHeight: 22
    },
    actionCard: {
        marginTop: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6
    },
    actionCardTitle: {
        fontSize: 13,
        fontWeight: '700'
    },
    actionCardAmount: {
        fontSize: 15,
        fontWeight: '800'
    },
    actionCardMeta: {
        fontSize: 12
    },
    actionCardBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginTop: 4,
        gap: 6
    },
    actionCardBtnText: {
        fontSize: 12,
        fontWeight: '800'
    },
    inputBar: {
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        gap: 10
    },
    textInput: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        maxHeight: 100
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center'
    },
    sendDisabled: {
        opacity: 0.4
    }
});


