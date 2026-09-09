import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { billingAPI } from '../services/api';
import { useFormat } from '../utils/format';
import {
    Building2, Sparkles, Camera, FileText, CheckCircle2, TrendingUp,
    ShieldCheck, ArrowRight, ArrowLeft, Play, Check, Layers, Globe, Users,
    Smartphone, Receipt, Scale, DollarSign, Clock, ChevronRight, ChevronLeft,
    Zap, Award, Sun, Moon, ExternalLink, Lock, RefreshCw, AlertCircle,
    BarChart3, Database, Inbox, CheckCircle, Flame, HardHat, FileSpreadsheet,
    LogOut, Mail, MessageCircle
} from 'lucide-react';
import './Landing.css';

const OCR_SCENARIOS = [
    {
        id: 'ezz-steel',
        titleAr: '🧾 فاتورة حديد عز (مواد)',
        titleEn: '🧾 Ezz Steel Tax Invoice',
        vendorAr: 'شركة حديد عز للصناعة',
        vendorEn: 'Ezz Steel Industry Co.',
        projectAr: 'برج الأمل السكني',
        projectEn: 'Al-Amal Tower',
        categoryAr: 'حديد ومواد تسليح',
        categoryEn: 'Rebar & Steel Materials',
        amount: '185,000 EGP',
        vat: '+25,900 EGP (14% VAT)',
        taxNumber: '100-345-890',
        date: '2026-08-28',
        itemsAr: 'توريد 4 طن حديد تسليح مشرشر 16مم و12مم عالي المقاومة',
        itemsEn: '4 Tons deformed high-tensile steel rebar 16mm & 12mm',
        confidence: '99.8%'
    },
    {
        id: 'lafarge-cement',
        titleAr: '🏗️ فاتورة لافارج للأسمنت (خرسانة)',
        titleEn: '🏗️ Lafarge Cement Invoice',
        vendorAr: 'شركة لافارج مصر للأسمنت',
        vendorEn: 'Lafarge Egypt Cement',
        projectAr: 'فيلا التجمع الخامس',
        projectEn: 'New Cairo Villa',
        categoryAr: 'أسمنت ومواد بناء',
        categoryEn: 'Cement & Building Materials',
        amount: '42,600 EGP',
        vat: '+5,964 EGP (14% VAT)',
        taxNumber: '204-871-112',
        date: '2026-08-29',
        itemsAr: 'توريد 15 طن أسمنت بورتلاندي مقاوم للكبريتات',
        itemsEn: '15 Tons Portland Sulfate-Resistant Bulk Cement',
        confidence: '99.4%'
    },
    {
        id: 'excavator-fuel',
        titleAr: '⛽ إيصال وقود وطنية (معدات)',
        titleEn: '⛽ Watanya Fuel Receipt',
        vendorAr: 'محطة وطنية للبترول',
        vendorEn: 'Watanya Petroleum',
        projectAr: 'موقع العاصمة الإدارية',
        projectEn: 'New Capital Site',
        categoryAr: 'وقود ومعدات موقع',
        categoryEn: 'Fuel & Site Equipment',
        amount: '8,500 EGP',
        vat: '+1,190 EGP (14% VAT)',
        taxNumber: '310-992-441',
        date: '2026-08-30',
        itemsAr: 'تفويل سولار ديزل لحفار كاتربيلر ومولد الموقع',
        itemsEn: 'Diesel fuel refill for CAT Excavator & Site Generator',
        confidence: '99.1%'
    }
];

export default function Landing() {
    const { t, i18n } = useTranslation();
    const { user, logout } = useAuth();
    const { currency } = useFormat();

    const [plans, setPlans] = useState([]);
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
    const [activeTab, setActiveTab] = useState('ocr');
    const [activeSection, setActiveSection] = useState('preview');

    // Interactive slider for approval threshold preview
    const [previewAmount, setPreviewAmount] = useState(25000);

    // Active Section Scroll Tracking (Scrollspy)
    useEffect(() => {
        const sections = ['preview', 'pain', 'modules', 'pricing'];
        const handleScroll = () => {
            const scrollPos = window.scrollY + 220;
            let current = 'preview';
            for (const sectionId of sections) {
                const el = document.getElementById(sectionId);
                if (el) {
                    const top = el.offsetTop;
                    if (scrollPos >= top) {
                        current = sectionId;
                    }
                }
            }
            setActiveSection(current);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Interactive OCR Receipt AI Simulator State
    const [selectedOcrScenario, setSelectedOcrScenario] = useState(0);
    const [ocrStage, setOcrStage] = useState('extracted'); // 'idle' | 'scanning' | 'extracted' | 'posted'

    const isRTL = i18n.language === 'ar';
    const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

    useEffect(() => {
        billingAPI.listPlans()
            .then(r => setPlans(r.data.data || []))
            .catch(() => {
                // Fallback default plans if offline
                setPlans([
                    {
                        key: 'FREE',
                        name: 'Free Plan',
                        nameAr: 'الباقة المجانية',
                        priceEgp: 0,
                        features: ['2 Active Projects', '2 Team Seats', '150 AI Extractions / mo', 'Standard DSR & Ledger'],
                        featuresAr: ['مشروعين نشطين', 'عضوين للفريق', '150 عملية ذكاء اصطناعي / شهر', 'تقارير يومية ودفتر الأستاذ']
                    },
                    {
                        key: 'PREMIUM',
                        name: 'Premium Plan',
                        nameAr: 'الباقة المميزة (Premium)',
                        priceEgp: 2450,
                        popular: true,
                        features: ['10 Active Projects', '15 Team Seats', '1,000 AI Actions / mo', 'Bank Reconciliation & Approvals'],
                        featuresAr: ['10 مشاريع نشطة', '15 مستخدم بصلاحيات متقدمة', '1,000 عملية ذكاء اصطناعي / شهر', 'المطابقة البنكية ونظام الموافقات']
                    },
                    {
                        key: 'BUSINESS',
                        name: 'Business Plan',
                        nameAr: 'باقة الأعمال (Business)',
                        priceEgp: 4450,
                        features: ['30 Active Projects', '40 Team Seats', '3,500 AI Actions / mo', 'Full Audit Logs & VAT Invoicing'],
                        featuresAr: ['30 مشروع نشط', '40 مستخدم بصلاحيات كاملة', '3,500 عملية ذكاء اصطناعي / شهر', 'سجلات التدقيق وفواتير ضريبة القيمة المضافة']
                    },
                    {
                        key: 'ENTERPRISE',
                        name: 'Enterprise Plan',
                        nameAr: 'باقة الشركات (Enterprise)',
                        priceEgp: null,
                        isCustom: true,
                        features: ['Unlimited Projects & Users', 'Dedicated Database Instance', '10,000+ AI Actions & SLA', '24/7 Dedicated Account Manager'],
                        featuresAr: ['مشاريع ومستخدمين غير محدودين', 'قاعدة بيانات مخصصة للشركة', '10,000+ عملية ذكاء اصطناعي مع SLA', 'مدير حساب ودعم فني مخصص 24/7']
                    }
                ]);
            });
    }, [isRTL]);

    const toggleLang = () => {
        const newLang = isRTL ? 'en' : 'ar';
        i18n.changeLanguage(newLang);
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    };

    const getApproverForAmount = (amt) => {
        if (amt <= 5000) return { role: isRTL ? 'مهندس الموقع' : 'Site Engineer', color: '#10b981', note: isRTL ? 'موافقة فورية ضمن عهدة الموقع' : 'Auto-approved within site custody' };
        if (amt <= 50000) return { role: isRTL ? 'مدير المشروع' : 'Project Manager', color: '#f59e0b', note: isRTL ? 'تتطلب اعتماد مدير المشروع الهندسي' : 'Requires Project Manager Sign-off' };
        return { role: isRTL ? 'المدير العام / الإدارة العليا' : 'General Manager / Executive', color: '#ef4444', note: isRTL ? 'تتطلب موافقة مجلس الإدارة' : 'Requires Executive Board Approval' };
    };

    return (
        <div className="landing-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Ambient Background & Grid Mesh */}
            <div className="landing-ambient-bg">
                <div className="landing-glow-1"></div>
                <div className="landing-glow-2"></div>
                <div className="landing-glow-3"></div>
                <div className="landing-grid-overlay"></div>
            </div>

            {/* ---------- Header / Nav ---------- */}
            <header className="landing-header">
                <div className="landing-nav-container">
                    <Link to="/" className="landing-brand">
                        <div className="landing-logo-badge">
                            <Building2 size={24} />
                        </div>
                        <div className="landing-brand-text">
                            <span>Hesaby<span style={{ color: '#ff5a36' }}>.ai</span></span>
                            <span style={{
                                fontSize: '0.65rem',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                background: 'rgba(255, 90, 54, 0.15)',
                                color: '#ff8c42',
                                border: '1px solid rgba(255, 90, 54, 0.3)',
                                fontWeight: 800
                            }}>
                                ERP 2.0
                            </span>
                        </div>
                    </Link>

                    {/* Navigation Links with Active Animated Dots */}
                    <nav className="landing-nav-links">
                        {[
                            { id: 'preview', label: t('landing.nav.preview', 'Live Preview'), labelAr: 'العرض التفاعلي' },
                            { id: 'pain', label: t('landing.nav.features', 'Why Us'), labelAr: 'لماذا حسابي' },
                            { id: 'modules', label: t('landing.nav.modules', 'ERP Modules'), labelAr: 'الموديولات' },
                            { id: 'pricing', label: t('landing.nav.pricing', 'Pricing'), labelAr: 'الأسعار والباقات' },
                        ].map((item) => {
                            const isActive = activeSection === item.id;
                            return (
                                <a 
                                    key={item.id} 
                                    href={`#${item.id}`} 
                                    className={`landing-nav-link ${isActive ? 'active' : ''}`}
                                >
                                    <span className={`landing-nav-dot ${isActive ? 'active' : ''}`} />
                                    <span>{isRTL ? item.labelAr : item.label}</span>
                                </a>
                            );
                        })}
                    </nav>

                    {/* Actions */}
                    <div className="landing-nav-actions">
                        <button
                            type="button"
                            onClick={toggleLang}
                            className="landing-icon-btn"
                            title="Toggle Language"
                        >
                            <Globe size={16} />
                            <span>{isRTL ? 'English' : 'عربي'}</span>
                        </button>

                        {user ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Link to="/dashboard" className="landing-btn-primary" style={{ padding: '8px 18px', fontSize: '0.9rem' }}>
                                    <span>{t('landing.nav.openApp', 'Dashboard')}</span>
                                    <ArrowIcon size={16} />
                                </Link>
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="landing-btn-logout"
                                    title={isRTL ? 'تسجيل الخروج' : 'Sign Out'}
                                >
                                    <LogOut size={15} />
                                    <span>{isRTL ? 'خروج' : 'Sign Out'}</span>
                                </button>
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="landing-icon-btn" style={{ fontWeight: 700 }}>
                                    {t('landing.nav.signIn', 'Sign In')}
                                </Link>
                                <Link to="/signup" className="landing-btn-primary" style={{ padding: '8px 18px', fontSize: '0.9rem' }}>
                                    <span>{t('landing.nav.startFree', 'Start Free')}</span>
                                    <ArrowIcon size={16} />
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main style={{ position: 'relative', zIndex: 10, flexGrow: 1 }}>
                {/* ---------- Hero Section ---------- */}
                <section className="landing-hero">
                    <div className="landing-hero-badge">
                        <Flame size={16} />
                        <span>{t('landing.badge', 'Next-Gen Construction & Engineering Management')}</span>
                    </div>

                    <h1 className="landing-hero-title">
                        {t('landing.heroTitle1', isRTL ? 'فواتيرك، تقاريرك، وميزانيات مشاريعك...' : 'Your Receipts, Reports & Budgets...')}<br />
                        <span className="landing-gradient-text">
                            {t('landing.heroTitle2', isRTL ? 'مدققة ومطابقة في ثوانٍ معدودة.' : 'Reconciled & Audited in Seconds.')}
                        </span>
                    </h1>

                    <p className="landing-hero-subtitle">
                        {t('landing.heroSubtitle', isRTL ? 'النظام المحاسبي والهندسي السحابي لشركات المقاولات والاستشارات في مصر. حوّل الفواتير المصورة والتقارير اليومية إلى قيود أستاذ مدققة وخزائن حية ومطابقات بنكية فورية بنقرة واحدة.' : 'The comprehensive AI-powered ERP tailored for Egyptian construction firms and engineering consultancies. Turn paper receipts, daily site reports, and bank statements into audit-proof ledgers, real-time safes, and automated tax books in one click.')}
                    </p>

                    <div className="landing-hero-actions">
                        <Link to={user ? '/dashboard' : '/signup'} className="landing-btn-primary">
                            <span>{user ? t('landing.nav.openApp', 'Open Dashboard') : t('landing.startPilot', 'Start Your Free Pilot')}</span>
                            <ArrowIcon size={20} />
                        </Link>

                        <a href="#preview" className="landing-btn-secondary">
                            <Play size={16} />
                            <span>{t('landing.seeFeatures', 'Explore System')}</span>
                        </a>
                    </div>

                    <div className="landing-trust-bar">
                        <div className="landing-trust-item">
                            <CheckCircle2 size={18} className="landing-trust-icon" />
                            <span>{t('landing.trustNoCard', 'No credit card required · Free forever for 1 project')}</span>
                        </div>
                        <div className="landing-trust-item">
                            <CheckCircle2 size={18} className="landing-trust-icon" />
                            <span>{t('landing.trustVat', '100% Egyptian VAT Compliant (14% VAT)')}</span>
                        </div>
                        <div className="landing-trust-item">
                            <CheckCircle2 size={18} className="landing-trust-icon" />
                            <span>{t('landing.trustOffline', 'Field-ready for low-connectivity site conditions')}</span>
                        </div>
                    </div>
                </section>

                {/* ---------- Interactive Live ERP Showcase ---------- */}
                <section id="preview" className="landing-preview-section">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">{t('landing.preview.tag', 'Live Interactive Showcase')}</span>
                        <h2 className="landing-section-title">
                            {t('landing.preview.title', 'Experience Hesaby ERP at Site and in the Office')}
                        </h2>
                    </div>

                    {/* Tabs */}
                    <div className="landing-tabs-container">
                        {[
                            { key: 'ocr', label: isRTL ? 'المسح الضوئي للفواتير (OCR)' : 'Smart Receipt & PDF OCR', icon: Camera },
                            { key: 'safes', label: isRTL ? 'الخزائن ونظام الأرباح' : 'Safes & Profit Engine', icon: DollarSign },
                            { key: 'dsr', label: isRTL ? 'التقارير اليومية (DSR)' : 'Daily Site Reports (DSR)', icon: HardHat },
                            { key: 'recon', label: isRTL ? 'المطابقة البنكية' : 'Smart Bank Reconciliation', icon: Scale },
                            { key: 'approval', label: isRTL ? 'سلسلة الموافقات' : 'Multi-Level Approvals', icon: ShieldCheck },
                        ].map(tab => {
                            const TabIcon = tab.icon;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`landing-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                                >
                                    <TabIcon size={18} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Window Container */}
                    <div className="landing-showcase-window">
                        <div className="landing-window-header">
                            <div className="landing-window-dots">
                                <span className="landing-dot red"></span>
                                <span className="landing-dot yellow"></span>
                                <span className="landing-dot green"></span>
                            </div>
                            <div className="landing-window-title">
                                <Building2 size={14} />
                                <span>hesaby.ai/app/{activeTab}</span>
                            </div>
                            <div style={{ width: 40 }}></div>
                        </div>

                        <div className="landing-window-body">
                            {/* Tab 1: Smart Receipt & PDF OCR */}
                            {activeTab === 'ocr' && (() => {
                                const currentScenario = OCR_SCENARIOS[selectedOcrScenario] || OCR_SCENARIOS[0];
                                const isScanning = ocrStage === 'scanning';
                                const isPosted = ocrStage === 'posted';

                                return (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                    {isRTL ? 'المسح الضوئي الذكي للفواتير (AI OCR)' : 'Smart AI Document & Receipt OCR'}
                                                </span>
                                                <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800 }}>
                                                    LIVE OCR DEMO
                                                </span>
                                            </div>

                                            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '8px 0 14px', color: '#fff', lineHeight: 1.3 }}>
                                                {isRTL ? 'التقط صورة الفاتورة أو ارفع ملف PDF.. والاستخراج فوري' : 'Snap Receipt Photo or Upload PDF.. Structured Instantly'}
                                            </h3>

                                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '18px' }}>
                                                {isRTL
                                                    ? 'يمسح محرك الذكاء الاصطناعي فواتير الموقع، ويستخرج اسم المورد، الرقم الضريبي، تاريخ المعاملة، وتفاصيل البنود ونسبة الـ 14% VAT دون كتابة يدوية:'
                                                    : 'AI scans site receipts, extracting vendor, Egyptian Tax ID, date, line items, and 14% VAT breakdown with zero manual entry:'}
                                            </p>

                                            {/* Scenario Switcher Pills */}
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                                {OCR_SCENARIOS.map((sc, idx) => (
                                                    <button
                                                        key={sc.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedOcrScenario(idx);
                                                            setOcrStage('scanning');
                                                            setTimeout(() => setOcrStage('extracted'), 400);
                                                        }}
                                                        className={`scenario-pill ${selectedOcrScenario === idx ? 'active' : ''}`}
                                                    >
                                                        {isRTL ? sc.titleAr : sc.titleEn}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Action Buttons */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOcrStage('scanning');
                                                        setTimeout(() => setOcrStage('extracted'), 500);
                                                    }}
                                                    className="landing-btn-primary"
                                                    style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                                                >
                                                    <Camera size={18} />
                                                    <span>{isRTL ? 'إعادة مسح الفاتورة ضوئياً' : 'Scan & Extract Receipt'}</span>
                                                </button>

                                                {isScanning && (
                                                    <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Sparkles size={16} className="animate-spin" />
                                                        {isRTL ? 'جارٍ قراءة البنود والضريبة...' : 'AI Scanning & Extracting...'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Dynamic Scanned Voucher Card */}
                                        <div style={{
                                            background: 'rgba(15, 23, 42, 0.85)',
                                            border: isScanning ? '1px solid #38bdf8' : isPosted ? '1px solid #10b981' : '1px solid rgba(56, 189, 248, 0.3)',
                                            borderRadius: '16px',
                                            padding: '1.5rem',
                                            boxShadow: isScanning ? '0 0 30px rgba(56,189,248,0.3)' : '0 12px 30px rgba(0,0,0,0.4)',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {isPosted ? (
                                                /* Success Posted State */
                                                <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                                                    <div style={{
                                                        width: 56,
                                                        height: 56,
                                                        borderRadius: '50%',
                                                        background: 'rgba(16, 185, 129, 0.15)',
                                                        color: '#10b981',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        margin: '0 auto 16px',
                                                        border: '2px solid #10b981'
                                                    }}>
                                                        <CheckCircle2 size={32} />
                                                    </div>
                                                    <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
                                                        {isRTL ? 'تم الترحيل بنجاح إلى الخزينة ودفتر الأستاذ!' : 'Successfully Posted to Safe & Ledger!'}
                                                    </h4>
                                                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 20px', lineHeight: 1.6 }}>
                                                        {isRTL
                                                            ? `تم خصم ${currentScenario.amount} من خزينة ${currentScenario.projectAr} وترحيل ضريبة القيمة المضافة (${currentScenario.vat}) إلى سجل الضرائب تلقائياً.`
                                                            : `Debited ${currentScenario.amount} from ${currentScenario.projectEn} safe and recorded ${currentScenario.vat} in tax ledger.`}
                                                    </p>

                                                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedOcrScenario((selectedOcrScenario + 1) % OCR_SCENARIOS.length);
                                                                setOcrStage('extracted');
                                                            }}
                                                            className="landing-btn-secondary"
                                                            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                                                        >
                                                            <RefreshCw size={14} />
                                                            <span>{isRTL ? 'تجربة فاتورة أخرى' : 'Try Another Invoice'}</span>
                                                        </button>
                                                        <Link
                                                            to="/signup"
                                                            className="landing-btn-primary"
                                                            style={{ fontSize: '0.85rem', padding: '8px 18px' }}
                                                        >
                                                            <span>{isRTL ? 'ابدأ حساب شركتك مجاناً' : 'Get Started Free'}</span>
                                                            <ArrowIcon size={14} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Standard Scanned OCR Card */
                                                <>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></span>
                                                            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                                                {isRTL ? 'فاتورة ضريبية مقروءة بنجاح' : 'Tax Invoice OCR Verified'}
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                                                            {currentScenario.confidence} AI Accuracy
                                                        </span>
                                                    </div>

                                                    {/* Items / Description Note */}
                                                    <div style={{
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        padding: '12px 14px',
                                                        borderRadius: '10px',
                                                        fontSize: '0.88rem',
                                                        color: '#cbd5e1',
                                                        marginBottom: '14px',
                                                        lineHeight: 1.6
                                                    }}>
                                                        <strong>{isRTL ? 'بيان البنود: ' : 'Line Items: '}</strong>
                                                        {isRTL ? currentScenario.itemsAr : currentScenario.itemsEn}
                                                    </div>

                                                    {/* Parsed Fields Grid */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{isRTL ? 'إجمالي الفاتورة' : 'Total Amount'}</div>
                                                            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.15rem' }}>{currentScenario.amount}</div>
                                                        </div>
                                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{isRTL ? 'ضريبة القيمة المضافة (14%)' : 'VAT (14%)'}</div>
                                                            <div style={{ fontWeight: 700, color: '#38bdf8' }}>{currentScenario.vat}</div>
                                                        </div>
                                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{isRTL ? 'المورد / السجل' : 'Vendor / Tax ID'}</div>
                                                            <div style={{ fontWeight: 700, color: '#fff' }}>{isRTL ? currentScenario.vendorAr : currentScenario.vendorEn}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{currentScenario.taxNumber}</div>
                                                        </div>
                                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{isRTL ? 'المشروع والتصنيف' : 'Project & Category'}</div>
                                                            <div style={{ fontWeight: 700, color: '#ff8c42' }}>{isRTL ? currentScenario.projectAr : currentScenario.projectEn}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{isRTL ? currentScenario.categoryAr : currentScenario.categoryEn}</div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setOcrStage('posted')}
                                                        className="landing-btn-primary"
                                                        style={{ width: '100%', marginTop: '14px', padding: '10px', justifyContent: 'center', fontSize: '0.9rem' }}
                                                    >
                                                        <CheckCircle2 size={16} />
                                                        <span>{isRTL ? 'اعتماد وترحيل فوري إلى الخزينة' : 'Approve & Post to Safe'}</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Tab 2: Safes & Profit Engine */}
                            {activeTab === 'safes' && (
                                <div>
                                    <div style={{ textAlign: 'center', maxWidth: 650, margin: '0 auto 24px' }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>
                                            {isRTL ? 'محرك الأرباح V1.2 وفصل الخزائن المحكم' : 'V1.2 Office Profit Engine & Dual Safes'}
                                        </h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            {isRTL
                                                ? 'عزل كامل بين أموال المالك وخزينة المكتب مع تحويل آلي لنسبة الإشراف الإدارية (Management Fee) فور اعتماد المصروف.'
                                                : 'Complete isolation between Project Safe and Office Safe with automated management fee allocation.'}
                                        </p>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px', padding: '1.5rem' }}>
                                            <div style={{ color: '#60a5fa', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                                                {isRTL ? 'خزينة المشروع (Project Safe)' : 'Project Safe'}
                                            </div>
                                            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', marginBottom: 8 }}>2,450,000 EGP</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                {isRTL ? 'مخصص للمواد، المقاولين، والمصنعيات المباشرة' : 'Reserved for site materials & contractor wages'}
                                            </div>
                                        </div>

                                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', padding: '1.5rem' }}>
                                            <div style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                                                {isRTL ? 'خزينة وأرباح المكتب (Office Safe)' : 'Office Safe & Revenue'}
                                            </div>
                                            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', marginBottom: 8 }}>367,500 EGP</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                {isRTL ? 'صافي نسبة الإشراف المحصلة (15% Net Fee)' : 'Earned Management Fees (15% Net Margin)'}
                                            </div>
                                        </div>

                                        <div style={{ background: 'rgba(255, 90, 54, 0.08)', border: '1px solid rgba(255, 90, 54, 0.3)', borderRadius: '16px', padding: '1.5rem' }}>
                                            <div style={{ color: '#ff8c42', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                                                {isRTL ? 'التحويل الآلي للأرباح' : 'Automated Margin Transfer'}
                                            </div>
                                            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ff5a36', marginBottom: 8 }}>+3,675 EGP</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                {isRTL ? 'يُحوّل تلقائياً لحظة اعتماد كل مصروف' : 'Auto-credited upon each approved site expense'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Daily Site Reports */}
                            {activeTab === 'dsr' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                                            {isRTL ? 'متابعة الموقع لحظة بلحظة' : 'Field Operations & Workforce'}
                                        </span>
                                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '8px 0 16px', color: '#fff' }}>
                                            {isRTL ? 'تقارير يومية DSR معتمدة وموثقة' : 'Verified Daily Site Reports (DSR)'}
                                        </h3>
                                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                                            {isRTL
                                                ? 'سجل درجات الحرارة والطقس، حضور العمالة، تشوينات المواد، صب الخرسانات، وتوقيع الاستشاري الرقمي في تقرير رسمي فوري.'
                                                : 'Track weather conditions, labor headcounts, equipment hours, material deliveries, and digital supervisor sign-offs.'}
                                        </p>
                                    </div>

                                    <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{isRTL ? 'تقرير الموقع اليومي #142' : 'Daily Site Report #142'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isRTL ? 'برج النرجس — التجمع الخامس' : 'Al-Narges Tower — New Cairo'}</div>
                                            </div>
                                            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800 }}>
                                                {isRTL ? 'معتمد من الاستشاري' : 'Consultant Approved'}
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '14px 0', textAlign: 'center' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 4px', borderRadius: 8 }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>34</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{isRTL ? 'حضور العمال' : 'Labor Count'}</div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 4px', borderRadius: 8 }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>☀️ 31°C</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{isRTL ? 'طقس معتدل' : 'Weather'}</div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 4px', borderRadius: 8 }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>60 m³</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{isRTL ? 'صب خرسانة' : 'Concrete Pour'}</div>
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                            <strong>{isRTL ? 'ملاحظة المهندس:' : 'Engineer Note:'}</strong> {isRTL ? 'تم الانتهاء من حدادة وسقف الدور الثالث وجاري الاستلام الهندسي.' : 'Completed 3rd floor rebar; ready for structural inspection.'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: Smart Bank Reconciliation */}
                            {activeTab === 'recon' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                                            {isRTL ? 'مطابقة الحسابات البنكية' : 'Bank Reconciliation Engine'}
                                        </span>
                                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '8px 0 16px', color: '#fff' }}>
                                            {isRTL ? 'ارفع كشف الحساب البنكي.. والمطابقة في ثوانٍ' : 'Instant CSV Statement Auto-Matching'}
                                        </h3>
                                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                                            {isRTL
                                                ? 'متوافق مع كشوف حساب البنك الأهلي NBE، بنك مصر، وCIB. يطابق الإيداعات والمسحوبات مع قيود الدفتر ويكشف أي فرق مالي.'
                                                : 'Parses NBE, CIB, and Banque Misr statements. Matches thousands of transactions and flags discrepancies automatically.'}
                                        </p>
                                    </div>

                                    <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <span style={{ fontWeight: 800, color: '#fff' }}>{isRTL ? 'كشف حساب NBE — حساب المقاولات' : 'NBE Corporate Account'}</span>
                                            <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.85rem' }}>100% Matched</span>
                                        </div>

                                        <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
                                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' }}></div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                <span>{isRTL ? 'تحويل دفعة عميل (برج الأمل)' : 'Client Inflow (Al-Amal)'}</span>
                                                <strong style={{ color: '#10b981' }}>+450,000 EGP</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                                <span>{isRTL ? 'شيك مصنع حديد عز' : 'Ezz Steel Vendor Check'}</span>
                                                <strong style={{ color: '#ef4444' }}>-185,000 EGP</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 5: Multi-Level Approvals */}
                            {activeTab === 'approval' && (
                                <div>
                                    <div style={{ textAlign: 'center', maxWidth: 650, margin: '0 auto 20px' }}>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>
                                            {isRTL ? 'سلسلة الموافقات والصلاحيات التلقائية' : 'Configurable Approval Thresholds'}
                                        </h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            {isRTL
                                                ? 'حدد سقف الاعتماد المالي لكل دور هندسي لمنع الصرف غير المصرح به وضمان التدقيق المحاسبي.'
                                                : 'Enforce approval limits by amount. Move the slider to test threshold routing.'}
                                        </p>
                                    </div>

                                    {/* Slider */}
                                    <div style={{ maxWidth: 500, margin: '0 auto 20px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 700 }}>
                                            <span>{isRTL ? 'قيمة المصروف التجريبي:' : 'Sample Expense Amount:'}</span>
                                            <span style={{ color: '#ff5a36', fontSize: '1.2rem', fontWeight: 900 }}>{currency(previewAmount)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1000"
                                            max="150000"
                                            step="1000"
                                            value={previewAmount}
                                            onChange={(e) => setPreviewAmount(Number(e.target.value))}
                                            style={{ width: '100%', accentColor: '#ff5a36', cursor: 'pointer' }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                                            <span>1,000 EGP</span>
                                            <span>50,000 EGP</span>
                                            <span>150,000+ EGP</span>
                                        </div>
                                    </div>

                                    {/* Calculated Result */}
                                    {(() => {
                                        const approver = getApproverForAmount(previewAmount);
                                        return (
                                            <div style={{
                                                maxWidth: 500,
                                                margin: '0 auto',
                                                background: 'rgba(15, 23, 42, 0.8)',
                                                border: `1px solid ${approver.color}`,
                                                borderRadius: 14,
                                                padding: '16px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                                    {isRTL ? 'المسؤول المطلوب للاعتماد:' : 'Required Approval Authority:'}
                                                </div>
                                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: approver.color, marginBottom: 4 }}>
                                                    {approver.role}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                                                    {approver.note}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ---------- Pain points / Before vs After ---------- */}
                <section id="pain" className="landing-preview-section" style={{ paddingTop: '2rem' }}>
                    <div className="landing-section-header">
                        <span className="landing-section-tag">{t('landing.pain.tag', 'Why Hesaby ERP?')}</span>
                        <h2 className="landing-section-title">
                            {t('landing.pain.title', 'Contractor Bottlenecks Solved for Good')}
                        </h2>
                    </div>

                    <div className="landing-pain-grid">
                        {[
                            {
                                icon: Receipt,
                                title: t('landing.pain.p1Title', 'Lost & Ruined Paper Receipts'),
                                desc: t('landing.pain.p1Desc', 'Paper invoices get destroyed in dusty site pockets before Friday payroll. With Hesaby, snap a photo or upload a PDF; AI extracts vendor and items immediately.')
                            },
                            {
                                icon: FileSpreadsheet,
                                title: t('landing.pain.p2Title', 'Excel Spreadsheet Chaos'),
                                desc: t('landing.pain.p2Desc', 'Site engineers use v3.xlsx while the office uses v5.xlsx and the bank statement matches neither. Hesaby unifies everything in real-time.')
                            },
                            {
                                icon: AlertCircle,
                                title: t('landing.pain.p3Title', 'WhatsApp Approval Amnesia'),
                                desc: t('landing.pain.p3Desc', 'Who authorized that 150,000 EGP cement delivery? Nobody remembers. Hesaby enforces role-based approval thresholds with immutable audit logs.')
                            },
                            {
                                icon: TrendingUp,
                                title: t('landing.pain.p4Title', 'Leaking Management & Supervision Fees'),
                                desc: t('landing.pain.p4Desc', 'Discovering 6 months later that your cost-plus margin collapsed. The V1.2 Profit Engine auto-transfers management fees to office revenue upon approval.')
                            }
                        ].map((item, i) => {
                            const ItemIcon = item.icon;
                            return (
                                <div key={i} className="landing-pain-card">
                                    <div className="landing-pain-icon">
                                        <ItemIcon size={22} />
                                    </div>
                                    <h4>{item.title}</h4>
                                    <p>{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ---------- Modules Bento Grid ---------- */}
                <section id="modules" className="landing-preview-section">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">{t('landing.modules.tag', 'All-In-One Platform')}</span>
                        <h2 className="landing-section-title">
                            {t('landing.modules.title', 'End-to-End Control from Foundation to Final Audit')}
                        </h2>
                    </div>

                    <div className="landing-bento-grid">
                        {[
                            {
                                icon: Camera,
                                color: '#38bdf8',
                                bg: 'rgba(56, 189, 248, 0.1)',
                                title: isRTL ? 'المساعد الذكي واستخراج الفواتير OCR' : 'Smart AI Receipt & OCR Copilot',
                                desc: isRTL ? 'يمسح الفواتير المصورة وملفات الـ PDF ويستخرج البنود وضريبة القيمة المضافة والمورد ويرحلها تلقائياً للمسودات.' : 'Scans image and PDF receipts, extracting VAT, vendor details, and item lines straight into ledger drafts with zero manual entry.'
                            },
                            {
                                icon: DollarSign,
                                color: '#10b981',
                                bg: 'rgba(16, 185, 129, 0.1)',
                                title: t('landing.modules.m2Title', 'V1.2 Office Profit Engine & Dual Safes'),
                                desc: t('landing.modules.m2Desc', 'Strict segregation between Project Safe and Office Safe with automated management fee allocation and margin protection.')
                            },
                            {
                                icon: FileText,
                                color: '#38bdf8',
                                bg: 'rgba(56, 189, 248, 0.1)',
                                title: t('landing.modules.m3Title', 'Egyptian Tax Authority VAT Invoicing'),
                                desc: t('landing.modules.m3Desc', '14% VAT pre-calculated, bilingual branded PDFs, automated email dispatch, and partial payment tracking.')
                            },
                            {
                                icon: Users,
                                color: '#f59e0b',
                                bg: 'rgba(245, 158, 11, 0.1)',
                                title: t('landing.modules.m4Title', 'Workforce & Subcontractor Payroll'),
                                desc: t('landing.modules.m4Desc', 'Track daily laborers, piece-rate wages, cash advances, and subcontractor contracts with itemized statements.')
                            },
                            {
                                icon: Layers,
                                color: '#a855f7',
                                bg: 'rgba(168, 85, 247, 0.1)',
                                title: t('landing.modules.m5Title', 'Materials & Warehouse Inventory'),
                                desc: t('landing.modules.m5Desc', 'Track rebar, cement, and finishing batches delivered to each site with real-time unit costing against project BOQs.')
                            },
                            {
                                icon: Scale,
                                color: '#06b6d4',
                                bg: 'rgba(6, 182, 212, 0.1)',
                                title: t('landing.modules.m6Title', 'Automated Bank Reconciliation'),
                                desc: t('landing.modules.m6Desc', 'Upload NBE, CIB, or Banque Misr statements. Smart matching pairs thousands of transactions and flags discrepancies in seconds.')
                            }
                        ].map((m, i) => {
                            const MIcon = m.icon;
                            return (
                                <div key={i} className="landing-bento-card">
                                    <div className="landing-bento-icon" style={{ background: m.bg, color: m.color }}>
                                        <MIcon size={26} />
                                    </div>
                                    <h3>{m.title}</h3>
                                    <p>{m.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ---------- Mobile App Section ---------- */}
                <section className="landing-preview-section" style={{ paddingTop: '2rem' }}>
                    <div className="landing-glass-card" style={{ padding: '3.5rem 2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'center' }}>
                        <div>
                            <span className="landing-section-tag">{t('landing.mobile.tag', 'Mobile Companion')}</span>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: '10px 0 20px' }}>
                                {t('landing.mobile.title', 'Enterprise Power in Your Pocket')}
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                                {t('landing.mobile.desc', 'Built specifically for tough construction site environments. Ultra-high-contrast Field Mode ensures readability under harsh sunlight with instant offline expense queuing.')}
                            </p>

                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Smartphone size={28} style={{ color: '#00f0b5' }} />
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>EXPO / REACT NATIVE</div>
                                        <div style={{ fontWeight: 800, color: '#fff' }}>iOS & Android APK</div>
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Zap size={28} style={{ color: '#ff8c42' }} />
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>OFFLINE QUEUE</div>
                                        <div style={{ fontWeight: 800, color: '#fff' }}>Auto-Sync on Wi-Fi</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Phone Mockup */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                                width: 290,
                                height: 520,
                                background: '#0a0a0c',
                                border: '3px solid #334155',
                                borderRadius: 40,
                                padding: 12,
                                boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                {/* Speaker notch */}
                                <div style={{ width: 80, height: 16, background: '#1e293b', borderRadius: 999, margin: '0 auto 12px' }}></div>

                                {/* Screen Content */}
                                <div style={{ background: '#141414', borderRadius: 28, flexGrow: 1, padding: 14, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Hesaby Field</span>
                                            <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: 4 }}>ONLINE</span>
                                        </div>

                                        <div style={{ background: '#1f1f23', padding: 10, borderRadius: 10, marginBottom: 10, fontSize: '0.8rem' }}>
                                            <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Project Safe</div>
                                            <div style={{ fontWeight: 800, color: '#fff' }}>2,450,000 EGP</div>
                                        </div>

                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>Recent Site Expenses</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.75rem' }}>
                                            <div style={{ background: '#1f1f23', padding: 8, borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Cairo Cement</span>
                                                <strong style={{ color: '#ef4444' }}>-24,500</strong>
                                            </div>
                                            <div style={{ background: '#1f1f23', padding: 8, borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Rebar Batch #12</span>
                                                <strong style={{ color: '#ef4444' }}>-85,000</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Camera / Scan Floating Action Button */}
                                    <div style={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto',
                                        boxShadow: '0 8px 20px rgba(14,165,233,0.5)'
                                    }}>
                                        <Camera size={22} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------- Pricing Section ---------- */}
                <section id="pricing" className="landing-preview-section">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">{t('landing.pricing.tag', 'Transparent & Fair Pricing')}</span>
                        <h2 className="landing-section-title">
                            {t('landing.pricing.title', 'Invest in Operational Clarity')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: 8 }}>
                            {t('landing.pricing.subtitle', 'Start free forever. Scale your subscription as your engineering projects expand.')}
                        </p>

                        {/* Billing cycle switch */}
                        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', padding: 4, borderRadius: 12, marginTop: 20, border: '1px solid var(--border-color)' }}>
                            <button
                                type="button"
                                onClick={() => setBillingCycle('monthly')}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: 8,
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    background: billingCycle === 'monthly' ? '#ff5a36' : 'transparent',
                                    color: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                {t('landing.pricing.monthly', 'Monthly')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setBillingCycle('annual')}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: 8,
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    background: billingCycle === 'annual' ? '#ff5a36' : 'transparent',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <span>{t('landing.pricing.annual', 'Annually (20% OFF)')}</span>
                            </button>
                        </div>
                    </div>

                    <div className="landing-pricing-grid">
                        {plans.map(plan => {
                            const isPopular = plan.popular || plan.key === 'PREMIUM' || plan.key === 'BASIC';
                            const isEnterprise = plan.key === 'ENTERPRISE' || plan.isCustom || plan.priceEgp === null;
                            const isFree = !isEnterprise && (plan.priceEgp === 0 || plan.key === 'FREE');
                            const multiplier = billingCycle === 'annual' ? 0.8 : 1;
                            const price = !isEnterprise && plan.priceEgp !== null ? Math.round(plan.priceEgp * multiplier) : null;
                            const displayName = (isRTL && plan.nameAr) ? plan.nameAr : plan.name;
                            const displayFeatures = (isRTL && plan.featuresAr) ? plan.featuresAr : (plan.features || []);
                            
                            const userPlanKey = (user?.company?.subscriptionPlan || user?.subscriptionPlan || 'FREE').toUpperCase();
                            const isCurrentPlan = !!user && userPlanKey === (plan.key || '').toUpperCase();

                            return (
                                <div key={plan.key} className={`landing-price-card ${isPopular ? 'popular' : ''} ${isEnterprise ? 'enterprise-card' : ''}`}>
                                    {isPopular && (
                                        <div className="landing-popular-badge">
                                            {t('landing.pricing.popular', 'MOST POPULAR')}
                                        </div>
                                    )}

                                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>{displayName}</h3>

                                    <div className="landing-price-value">
                                        {isEnterprise ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                                <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#38bdf8', lineHeight: 1.25 }}>
                                                    {isRTL ? 'تسعير مخصص' : 'Custom Pricing'}
                                                </span>
                                                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, lineHeight: 1.35 }}>
                                                    {isRTL ? 'حسب حجم الشركة والمشاريع' : 'Tailored for your organization'}
                                                </span>
                                            </div>
                                        ) : isFree ? (
                                            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#22c55e', lineHeight: 1.2 }}>
                                                {t('landing.pricing.free', 'Free')}
                                            </span>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                <span style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.2 }}>{currency(price)}</span>
                                                <span className="landing-price-period"> / {isRTL ? 'شهرياً' : 'month'}</span>
                                            </div>
                                        )}
                                    </div>

                                    <ul className="landing-feature-list">
                                        {displayFeatures.map((feat, idx) => (
                                            <li key={idx} className="landing-feature-item">
                                                <CheckCircle size={18} style={{ color: isEnterprise ? '#38bdf8' : isPopular ? 'var(--color-primary, #ff5a36)' : '#22c55e', flexShrink: 0 }} />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {isEnterprise ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: 'auto' }}>
                                            <a
                                                href={`https://mail.google.com/mail/?view=cm&fs=1&to=nooraldeenahmed04@gmail.com&su=${encodeURIComponent(isRTL ? 'استفسار عن باقة الشركات Enterprise - نظام حسابي ERP' : 'Hesaby ERP Enterprise Plan Inquiry')}&body=${encodeURIComponent(isRTL ? 'مرحباً فريق مبيعات حسابي، نود الاستفسار عن باقة الشركات الكبرى (Enterprise) وتفاصيل الاشتراك المخصص لشركتنا.' : 'Hello Hesaby Sales Team, We would like to inquire about the Enterprise Plan and custom quotation for our organization.')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="landing-btn-secondary"
                                                style={{ width: '100%', justifyContent: 'center', border: '1px solid rgba(56, 189, 248, 0.5)', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.08)', gap: '8px', padding: '0.65rem 1rem' }}
                                            >
                                                <Mail size={16} />
                                                <span>{isRTL ? 'مراسلة المبيعات (Gmail)' : 'Email Sales (Gmail)'}</span>
                                            </a>
                                            <a
                                                href={`https://wa.me/201092041908?text=${encodeURIComponent(isRTL ? 'مرحباً، أود الاستفسار عن باقة الشركات الكبرى (Enterprise) لنظام حسابي ERP' : "Hello, I'm interested in Hesaby ERP Enterprise Plan")}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="landing-btn-secondary"
                                                style={{ width: '100%', justifyContent: 'center', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#22c55e', background: 'rgba(34, 197, 94, 0.06)', gap: '8px', padding: '0.65rem 1rem' }}
                                            >
                                                <MessageCircle size={16} />
                                                <span>{isRTL ? 'واتساب المبيعات' : 'WhatsApp Sales'}</span>
                                            </a>
                                        </div>
                                    ) : isCurrentPlan ? (
                                        <Link
                                            to="/billing"
                                            className="landing-btn-secondary"
                                            style={{ width: '100%', justifyContent: 'center', marginTop: 'auto', borderColor: '#10b981', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)' }}
                                        >
                                            <CheckCircle2 size={18} />
                                            <span>{t('landing.pricing.current', 'Current Plan')}</span>
                                        </Link>
                                    ) : (
                                        <Link
                                            to={user ? '/billing' : '/signup'}
                                            className={isPopular ? 'landing-btn-primary' : 'landing-btn-secondary'}
                                            style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                                        >
                                            <span>
                                                {isFree
                                                    ? t('landing.startPilot', 'Start Free')
                                                    : (user ? t('landing.pricing.upgrade', 'Upgrade Plan') : t('landing.pricing.choose', 'Choose Plan'))}
                                            </span>
                                            <ArrowIcon size={18} />
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ---------- Final Call to Action ---------- */}
                <section className="landing-preview-section" style={{ paddingBottom: '5rem' }}>
                    <div className="landing-glass-card" style={{
                        padding: '4rem 2rem',
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, rgba(255, 90, 54, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)',
                        borderColor: 'rgba(255, 90, 54, 0.3)'
                    }}>
                        <div style={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #ff5a36 0%, #ff8c42 100%)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            boxShadow: '0 10px 25px rgba(255,90,54,0.4)'
                        }}>
                            <Building2 size={32} />
                        </div>

                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>
                            {t('landing.cta.title', 'Ready to Transform Your Engineering Operations?')}
                        </h2>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 680, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
                            {t('landing.cta.subtitle', 'Join leading contractors and engineering consultancies operating with speed and precision on Hesaby ERP.')}
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link to={user ? '/dashboard' : '/signup'} className="landing-btn-primary" style={{ padding: '16px 36px', fontSize: '1.1rem' }}>
                                <span>{user ? t('landing.nav.openApp', 'Open Dashboard') : t('landing.cta.button', 'Start Your Free Pilot Now')}</span>
                                <ArrowIcon size={20} />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* ---------- Footer ---------- */}
            <footer style={{
                background: 'rgba(10, 10, 15, 0.95)',
                borderTop: '1px solid var(--border-color)',
                padding: '2.5rem 1.5rem',
                color: 'var(--text-tertiary)',
                fontSize: '0.9rem',
                position: 'relative',
                zIndex: 10
            }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Building2 size={20} style={{ color: '#ff5a36' }} />
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem' }}>Hesaby ERP</span>
                        <span>— Enterprise Construction Platform</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <span>{isRTL ? `جميع الحقوق محفوظة © ${new Date().getFullYear()} حسابي ERP` : `© ${new Date().getFullYear()} Hesaby ERP · All rights reserved.`}</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
