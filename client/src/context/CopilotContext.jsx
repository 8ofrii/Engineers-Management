import React, { createContext, useContext, useState } from 'react';

const CopilotContext = createContext();

export function CopilotProvider({ children }) {
    // Global modal control triggered by AI
    const [activeModal, setActiveModal] = useState(null); // 'ADD_TRANSACTION' | 'ADD_PROJECT' | 'ADD_CLIENT' | 'ADD_SUPPLIER'
    const [modalPrefillData, setModalPrefillData] = useState(null);

    const openModalWithData = (modalType, prefillData = null) => {
        setModalPrefillData(prefillData);
        setActiveModal(modalType);
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalPrefillData(null);
    };

    return (
        <CopilotContext.Provider value={{ activeModal, modalPrefillData, openModalWithData, closeModal }}>
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
