import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import './TransactionActionsMenu.css';

export default function TransactionActionsMenu({
    tx,
    isCancelled = false,
    onOpenDetail,
    onEdit,
    onRefund,
    onDelete,
    isArabic = false,
    t,
    size = 'default' // 'default' | 'small'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, placeAbove: false });
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const menuWidth = 165;
        // Approximate heights: cancelled has 2 items (view, delete) ~ 88px, active has 3 items (view, edit, refund) ~ 128px
        const estimatedHeight = isCancelled ? 90 : 130;
        
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const placeAbove = spaceBelow < estimatedHeight + 10 && spaceAbove > spaceBelow;

        // Position horizontally centered relative to trigger button
        let left = rect.left + (rect.width / 2) - (menuWidth / 2);
        if (left < 10) left = 10;
        if (left + menuWidth > window.innerWidth - 10) {
            left = window.innerWidth - menuWidth - 10;
        }

        const top = placeAbove ? (rect.top - estimatedHeight - 6) : (rect.bottom + 6);
        setMenuPosition({ top, left, placeAbove });
    }, [isCancelled]);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (!isOpen) {
            updatePosition();
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    const handleAction = (e, callback) => {
        e.stopPropagation();
        setIsOpen(false);
        if (callback) {
            callback(tx);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (e) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };

        const handleWindowChange = (e) => {
            // If scrolling occurred inside the menu itself, do not close
            if (e && e.target && menuRef.current && menuRef.current.contains(e.target)) return;
            setIsOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleWindowChange);
        window.addEventListener('scroll', handleWindowChange, true);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleWindowChange);
            window.removeEventListener('scroll', handleWindowChange, true);
        };
    }, [isOpen]);

    const btnSize = size === 'small' ? '22px' : '28px';
    const iconSize = size === 'small' ? 12 : 15;

    return (
        <div className="tx-menu-wrapper" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
                ref={triggerRef}
                type="button"
                className={`tx-kebab-btn ${isOpen ? 'active' : ''} ${size}`}
                onClick={handleToggle}
                title={isArabic ? 'خيارات المعاملة' : 'Transaction actions'}
                aria-label={isArabic ? 'خيارات المعاملة' : 'Transaction actions'}
                aria-expanded={isOpen}
                style={{
                    width: btnSize,
                    height: btnSize,
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    padding: 0
                }}
            >
                <MoreVertical size={iconSize} />
            </button>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className="tx-dropdown-portal"
                    dir={isArabic ? 'rtl' : 'ltr'}
                    style={{
                        position: 'fixed',
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                        zIndex: 999999,
                        width: '165px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="tx-dropdown-inner">
                        {/* 1. View Details */}
                        <button
                            type="button"
                            className="tx-dropdown-item view"
                            onClick={(e) => handleAction(e, onOpenDetail)}
                        >
                            <Eye size={14} className="item-icon" />
                            <span className="item-label">
                                {t ? t('common.view', isArabic ? 'عرض التفاصيل' : 'View Details') : (isArabic ? 'عرض التفاصيل' : 'View Details')}
                            </span>
                        </button>

                        {!isCancelled ? (
                            <>
                                {/* 2. Edit */}
                                <button
                                    type="button"
                                    className="tx-dropdown-item edit"
                                    onClick={(e) => handleAction(e, onEdit)}
                                >
                                    <Pencil size={14} className="item-icon" />
                                    <span className="item-label">
                                        {isArabic ? 'تعديل المعاملة' : (t ? t('common.edit') || 'Edit' : 'Edit')}
                                    </span>
                                </button>

                                {/* 3. Refund & Cancel */}
                                <button
                                    type="button"
                                    className="tx-dropdown-item refund"
                                    onClick={(e) => handleAction(e, onRefund)}
                                >
                                    <RotateCcw size={14} className="item-icon" />
                                    <span className="item-label">
                                        {isArabic ? 'استرداد وإلغاء' : (t ? t('finance.refund') || 'Refund' : 'Refund')}
                                    </span>
                                </button>
                            </>
                        ) : (
                            /* 4. Delete Permanently (only for cancelled / refunded) */
                            <button
                                type="button"
                                className="tx-dropdown-item delete"
                                onClick={(e) => handleAction(e, onDelete)}
                            >
                                <Trash2 size={14} className="item-icon" />
                                <span className="item-label">
                                    {isArabic ? 'حذف نهائي' : (t ? t('common.deletePermanently') || 'Delete Permanently' : 'Delete Permanently')}
                                </span>
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
