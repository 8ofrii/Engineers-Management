import React, { createContext, useContext, useState, useEffect } from 'react';

const CopilotContext = createContext();

export function CopilotProvider({ children }) {
    // Global modal control triggered by AI
    const [activeModal, setActiveModal] = useState(null); // 'ADD_TRANSACTION' | 'ADD_PROJECT' | 'ADD_CLIENT' | 'ADD_SUPPLIER'
    const [modalPrefillData, setModalPrefillData] = useState(null);

    // Global AI chat drawer open/closed state
    const [isChatOpen, setIsChatOpen] = useState(() => {
        return localStorage.getItem('ai_assistant_open') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('ai_assistant_open', String(isChatOpen));
    }, [isChatOpen]);

    const openChat = () => {
        setIsChatOpen(true);
    };

    const closeChat = () => {
        setIsChatOpen(false);
    };

    const toggleChat = () => {
        setIsChatOpen(prev => !prev);
    };

    const openModalWithData = (modalType, prefillData = null) => {
        setModalPrefillData(prefillData);
        setActiveModal(modalType);
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalPrefillData(null);
    };

    return (
        <CopilotContext.Provider value={{
            activeModal,
            modalPrefillData,
            openModalWithData,
            closeModal,
            isChatOpen,
            setIsChatOpen,
            openChat,
            closeChat,
            toggleChat
        }}>
            {children}
        </CopilotContext.Provider>
    );
}

export function useCopilot() {
    const context = useContext(CopilotContext);
    if (!context) {
        throw new Error('useCopilot must be used within a CopilotProvider');
    }
    return context;
}
