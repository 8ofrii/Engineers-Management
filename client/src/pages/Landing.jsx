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
import KineticGrid from '@/components/ui/kinetic-grid';
import { FlowButton } from '@/components/ui/flow-button';
import { BentoCard } from '@/components/ui/bento';
import HesabyBentoGrid from '@/components/ui/hesaby-bento';
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
            const scrollPos = window.scrollY + 240;
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
        <KineticGrid globalColor="default" className="min-h-screen bg-[#090d16] text-slate-100 font-sans">
            <div className="landing-wrapper" dir={isRTL ? 'rtl' : 'ltr'}>
                {/* Ambient Background & Subtle Masked Dots */}
                <div className="landing-ambient-bg">
                    <div className="landing-bg-dots"></div>
                    <div className="landing-hero-spotlight"></div>
                    <div className="landing-glow-secondary"></div>
                </div>

                {/* ---------- 1. Floating Tubelight Nav Dock ---------- */}
                <div className="landing-header-wrap">
                    <header className="landing-nav-container">
                        <Link to="/" className="landing-brand">
                            <div className="landing-logo-badge">
                                <Building2 size={20} />
                            </div>
                            <div className="landing-brand-text">
                                <span>Hesaby<span style={{ color: '#f97316' }}>.ai</span></span>
                                <span className="landing-version-pill">
                                    ERP 2.0
                                </span>
                            </div>
                        </Link>

                        {/* Navigation Links with Active Tubelight Indicator */}
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
                                <Globe size={15} />
                                <span>{isRTL ? 'English' : 'عربي'}</span>
                            </button>

                            {user ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Link to="/dashboard" className="landing-btn-primary" style={{ padding: '7px 16px', fontSize: '0.85rem' }}>
                                        <span>{t('landing.nav.openApp', 'Dashboard')}</span>
                                        <ArrowIcon size={15} />
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={logout}
                                        className="landing-btn-logout"
                                        title={isRTL ? 'تسجيل الخروج' : 'Sign Out'}
                                    >
                                        <LogOut size={14} />
                                        <span>{isRTL ? 'خروج' : 'Sign Out'}</span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Link to="/login" className="landing-icon-btn" style={{ fontWeight: 700 }}>
                                        {t('landing.nav.signIn', 'Sign In')}
                                    </Link>
                                    <Link to="/signup" className="landing-btn-primary">
                                        <span>{t('landing.nav.startFree', 'Start Free')}</span>
                                        <ArrowIcon size={15} />
                                    </Link>
                                </>
                            )}
                        </div>
                    </header>
                </div>

                <main style={{ position: 'relative', zIndex: 10, flexGrow: 1 }}>
                    {/* ---------- 2. Hero Section ---------- */}
                    <section className="landing-hero">
                        <div className="landing-hero-badge">
                            <span className="landing-pulse-dot"></span>
                            <span>{t('landing.badge', 'Hesaby ERP 2.0 · Built for Egyptian Construction & Engineering')}</span>
                        </div>

                        <h1 className="landing-hero-title">
                            {t('landing.heroTitle1', isRTL ? 'فواتيرك، تقاريرك، وميزانيات مشاريعك...' : 'Your Receipts, Site Reports & Budgets...')}<br />
                            <span className="landing-accent-gradient">
                                {t('landing.heroTitle2', isRTL ? 'مدققة ومطابقة في ثوانٍ معدودة.' : 'Reconciled & Audited in Seconds.')}
                            </span>
                        </h1>

                        <p className="landing-hero-subtitle">
                            {t('landing.heroSubtitle', isRTL ? 'النظام المحاسبي والهندسي السحابي لشركات المقاولات والاستشارات في مصر. حوّل الفواتير المصورة والتقارير اليومية إلى قيود أستاذ مدققة وخزائن حية ومطابقات بنكية فورية بنقرة واحدة.' : 'The comprehensive AI-powered ERP tailored for Egyptian construction firms and engineering consultancies. Turn paper receipts, daily site reports, and bank statements into audit-proof ledgers, real-time safes, and automated tax books in one click.')}
                        </p>

                        <div className="landing-hero-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                            <Link to={user ? '/dashboard' : '/signup'}>
                                <FlowButton 
                                    variant="hesaby" 
                                    text={user ? t('landing.nav.openApp', 'Open Dashboard') : t('landing.startPilot', 'Start Your Free Pilot')} 
                                />
                            </Link>

                            <a href="#preview">
                                <FlowButton 
                                    variant="light" 
                                    text={t('landing.seeFeatures', 'Explore System')} 
                                />
                            </a>
                        </div>

                    <div className="landing-trust-bar">
                        <div className="landing-trust-item">
                            <CheckCircle2 size={16} className="landing-trust-icon" />
                            <span>{t('landing.trustNoCard', 'No credit card required · Free forever for 1 project')}</span>
                        </div>
                        <div className="landing-trust-item">
                            <CheckCircle2 size={16} className="landing-trust-icon" />
                            <span>{t('landing.trustVat', '100% Egyptian VAT Compliant (14% VAT)')}</span>
                        </div>
                        <div className="landing-trust-item">
                            <CheckCircle2 size={16} className="landing-trust-icon" />
                            <span>{t('landing.trustOffline', 'Field-ready for low-connectivity site conditions')}</span>
                        </div>
                    </div>
                </section>

                {/* ---------- 3. Interactive Live ERP Showcase ---------- */}
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
                                    <TabIcon size={16} />
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
                                <Building2 size={13} />
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
                                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                    {isRTL ? 'المسح الضوئي الذكي للفواتير (AI OCR)' : 'Smart AI Document & Receipt OCR'}
                                                </span>
                                                <span style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '2px 8px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 800 }}>
                                                    LIVE DEMO
                                                </span>
                                            </div>

                                            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '6px 0 12px', color: '#fff', lineHeight: 1.3 }}>
                                                {isRTL ? 'التقط صورة الفاتورة أو ارفع ملف PDF.. والاستخراج فوري' : 'Snap Receipt Photo or Upload PDF.. Structured Instantly'}
                                            </h3>

                                            <p style={{ color: 'var(--landing-text-muted)', lineHeight: 1.65, fontSize: '0.92rem', marginBottom: '16px' }}>
                                                {isRTL
                                                    ? 'يمسح محرك الذكاء الاصطناعي فواتير الموقع، ويستخرج اسم المورد، الرقم الضريبي، تاريخ المعاملة، وتفاصيل البنود ونسبة الـ 14% VAT دون كتابة يدوية:'
                                                    : 'AI scans site receipts, extracting vendor, Egyptian Tax ID, date, line items, and 14% VAT breakdown with zero manual entry:'}
                                            </p>

                                            {/* Scenario Switcher Pills */}
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
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
                                                    style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                                                >
                                                    <Camera size={16} />
                                                    <span>{isRTL ? 'إعادة مسح الفاتورة ضوئياً' : 'Scan & Extract Receipt'}</span>
                                                </button>

                                                {isScanning && (
                                                    <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Sparkles size={15} className="animate-spin" />
                                                        {isRTL ? 'جارٍ قراءة البنود والضريبة...' : 'AI Scanning & Extracting...'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Dynamic Scanned Voucher Card */}
                                        <div style={{
                                            background: 'rgba(13, 19, 31, 0.9)',
                                            border: isScanning ? '1px solid #38bdf8' : isPosted ? '1px solid #10b981' : '1px solid rgba(56, 189, 248, 0.25)',
                                            borderRadius: '16px',
                                            padding: '1.35rem',
                                            boxShadow: isScanning ? '0 0 25px rgba(56,189,248,0.25)' : '0 12px 28px rgba(0,0,0,0.5)',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {isPosted ? (
                                                /* Success Posted State */
                                                <div style={{ textAlign: 'center', padding: '12px 6px' }}>
                                                    <div style={{
                                                        width: 52,
                                                        height: 52,
                                                        borderRadius: '50%',
                                                        background: 'rgba(16, 185, 129, 0.12)',
                                                        color: '#10b981',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        margin: '0 auto 14px',
                                                        border: '2px solid #10b981'
                                                    }}>
                                                        <CheckCircle2 size={28} />
                                                    </div>
                                                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
                                                        {isRTL ? 'تم الترحيل بنجاح إلى الخزينة ودفتر الأستاذ!' : 'Successfully Posted to Safe & Ledger!'}
                                                    </h4>
                                                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 18px', lineHeight: 1.6 }}>
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
                                                            style={{ fontSize: '0.82rem', padding: '7px 14px' }}
                                                        >
                                                            <RefreshCw size={13} />
                                                            <span>{isRTL ? 'تجربة فاتورة أخرى' : 'Try Another Invoice'}</span>
                                                        </button>
                                                        <Link
                                                            to="/signup"
                                                            className="landing-btn-primary"
                                                            style={{ fontSize: '0.82rem', padding: '7px 16px' }}
                                                        >
                                                            <span>{isRTL ? 'ابدأ حساب شركتك مجاناً' : 'Get Started Free'}</span>
                                                            <ArrowIcon size={14} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Standard Scanned OCR Card */
                                                <>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
                                                            <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                                                                {isRTL ? 'فاتورة ضريبية مقروءة بنجاح' : 'Tax Invoice OCR Verified'}
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: '0.72rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                                                            {currentScenario.confidence} AI Accuracy
                                                        </span>
                                                    </div>

                                                    {/* Items / Description Note */}
                                                    <div style={{
                                                        background: 'rgba(255, 255, 255, 0.02)',
                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                        padding: '10px 12px',
                                                        borderRadius: '8px',
                                                        fontSize: '0.84rem',
                                                        color: '#cbd5e1',
                                                        marginBottom: '12px',
                                                        lineHeight: 1.55
                                                    }}>
                                                        <strong>{isRTL ? 'بيان البنود: ' : 'Line Items: '}</strong>
                                                        {isRTL ? currentScenario.itemsAr : currentScenario.itemsEn}
                                                    </div>

                                                    {/* Parsed Fields Grid */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem' }}>
                                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <div style={{ color: 'var(--landing-text-subtle)', fontSize: '0.72rem' }}>{isRTL ? 'إجمالي الفاتورة' : 'Total Amount'}</div>
                                                            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.05rem' }}>{currentScenario.amount}</div>
                                                        </div>
                                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <div style={{ color: 'var(--landing-text-subtle)', fontSize: '0.72rem' }}>{isRTL ? 'ضريبة القيمة المضافة (14%)' : 'VAT (14%)'}</div>
                                                            <div style={{ fontWeight: 700, color: '#38bdf8' }}>{currentScenario.vat}</div>
                                                        </div>
                                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <div style={{ color: 'var(--landing-text-subtle)', fontSize: '0.72rem' }}>{isRTL ? 'المورد / السجل' : 'Vendor / Tax ID'}</div>
                                                            <div style={{ fontWeight: 700, color: '#fff' }}>{isRTL ? currentScenario.vendorAr : currentScenario.vendorEn}</div>
                                                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{currentScenario.taxNumber}</div>
                                                        </div>
                                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <div style={{ color: 'var(--landing-text-subtle)', fontSize: '0.72rem' }}>{isRTL ? 'المشروع والتصنيف' : 'Project & Category'}</div>
                                                            <div style={{ fontWeight: 700, color: '#ff8c42' }}>{isRTL ? currentScenario.projectAr : currentScenario.projectEn}</div>
                                                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{isRTL ? currentScenario.categoryAr : currentScenario.categoryEn}</div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setOcrStage('posted')}
                                                        className="landing-btn-primary"
                                                        style={{ width: '100%', marginTop: '12px', padding: '9px', justifyContent: 'center', fontSize: '0.86rem' }}
                                                    >
                                                        <CheckCircle2 size={15} />
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
                                    <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 20px' }}>
                                        <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>
                                            {isRTL ? 'محرك الأرباح V1.2 وفصل الخزائن المحكم' : 'V1.2 Office Profit Engine & Dual Safes'}
                                        </h3>
                                        <p style={{ color: 'var(--landing-text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                                            {isRTL
                                                ? 'عزل كامل بين أموال المالك وخزينة المكتب مع تحويل آلي لنسبة الإشراف الإدارية (Management Fee) فور اعتماد المصروف.'
                                                : 'Complete isolation between Project Safe and Office Safe with automated management fee allocation.'}
                                        </p>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.15rem' }}>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '14px', padding: '1.35rem' }}>
                                            <div style={{ color: '#60a5fa', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                                                {isRTL ? 'خزينة المشروع (Project Safe)' : 'Project Safe'}
                                            </div>
                                            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#fff', marginBottom: 6 }}>2,450,000 EGP</div>
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                {isRTL ? 'مخصص للمواد، المقاولين، والمصنعيات المباشرة' : 'Reserved for site materials & contractor wages'}
                                            </div>
                                        </div>

                                        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px', padding: '1.35rem' }}>
                                            <div style={{ color: '#34d399', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                                                {isRTL ? 'خزينة وأرباح المكتب (Office Safe)' : 'Office Safe & Revenue'}
                                            </div>
                                            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#10b981', marginBottom: 6 }}>367,500 EGP</div>
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                {isRTL ? 'صافي نسبة الإشراف المحصلة (15% Net Fee)' : 'Earned Management Fees (15% Net Margin)'}
                                            </div>
                                        </div>

                                        <div style={{ background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.25)', borderRadius: '14px', padding: '1.35rem' }}>
                                            <div style={{ color: '#fb923c', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                                                {isRTL ? 'التحويل الآلي للأرباح' : 'Automated Margin Transfer'}
                                            </div>
                                            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#f97316', marginBottom: 6 }}>+3,675 EGP</div>
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
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
                                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                                            {isRTL ? 'متابعة الموقع لحظة بلحظة' : 'Field Operations & Workforce'}
                                        </span>
                                        <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '6px 0 14px', color: '#fff' }}>
                                            {isRTL ? 'تقارير يومية DSR معتمدة وموثقة' : 'Verified Daily Site Reports (DSR)'}
                                        </h3>
                                        <p style={{ color: 'var(--landing-text-muted)', lineHeight: 1.65, fontSize: '0.92rem' }}>
                                            {isRTL
                                                ? 'سجل درجات الحرارة والطقس، حضور العمالة، تشوينات المواد، صب الخرسانات، وتوقيع الاستشاري الرقمي في تقرير رسمي فوري.'
                                                : 'Track weather conditions, labor headcounts, equipment hours, material deliveries, and digital supervisor sign-offs.'}
                                        </p>
                                    </div>

                                    <div style={{ background: 'rgba(13, 19, 31, 0.85)', border: '1px solid var(--landing-border)', borderRadius: '16px', padding: '1.35rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{isRTL ? 'تقرير الموقع اليومي #142' : 'Daily Site Report #142'}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--landing-text-subtle)' }}>{isRTL ? 'برج النرجس — التجمع الخامس' : 'Al-Narges Tower — New Cairo'}</div>
                                            </div>
                                            <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                                                {isRTL ? 'معتمد من الاستشاري' : 'Consultant Approved'}
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '12px 0', textAlign: 'center' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 4px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>34</div>
                                                <div style={{ fontSize: '0.68rem', color: 'var(--landing-text-subtle)' }}>{isRTL ? 'حضور العمال' : 'Labor Count'}</div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 4px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b' }}>☀️ 31°C</div>
                                                <div style={{ fontSize: '0.68rem', color: 'var(--landing-text-subtle)' }}>{isRTL ? 'طقس معتدل' : 'Weather'}</div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 4px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>60 m³</div>
                                                <div style={{ fontSize: '0.68rem', color: 'var(--landing-text-subtle)' }}>{isRTL ? 'صب خرسانة' : 'Concrete Pour'}</div>
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.02)', padding: '9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <strong>{isRTL ? 'ملاحظة المهندس:' : 'Engineer Note:'}</strong> {isRTL ? 'تم الانتهاء من حدادة وسقف الدور الثالث وجاري الاستلام الهندسي.' : 'Completed 3rd floor rebar; ready for structural inspection.'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: Smart Bank Reconciliation */}
                            {activeTab === 'recon' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                                            {isRTL ? 'مطابقة الحسابات البنكية' : 'Bank Reconciliation Engine'}
                                        </span>
                                        <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '6px 0 14px', color: '#fff' }}>
                                            {isRTL ? 'ارفع كشف الحساب البنكي.. والمطابقة في ثوانٍ' : 'Instant CSV Statement Auto-Matching'}
                                        </h3>
                                        <p style={{ color: 'var(--landing-text-muted)', lineHeight: 1.65, fontSize: '0.92rem' }}>
                                            {isRTL
                                                ? 'متوافق مع كشوف حساب البنك الأهلي NBE، بنك مصر، وCIB. يطابق الإيداعات والمسحوبات مع قيود الدفتر ويكشف أي فرق مالي.'
                                                : 'Parses NBE, CIB, and Banque Misr statements. Matches thousands of transactions and flags discrepancies automatically.'}
                                        </p>
                                    </div>

                                    <div style={{ background: 'rgba(13, 19, 31, 0.85)', border: '1px solid var(--landing-border)', borderRadius: '16px', padding: '1.35rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                            <span style={{ fontWeight: 800, color: '#fff' }}>{isRTL ? 'كشف حساب NBE — حساب المقاولات' : 'NBE Corporate Account'}</span>
                                            <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.82rem' }}>100% Matched</span>
                                        </div>

                                        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
                                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' }}></div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(16, 185, 129, 0.04)', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                                <span>{isRTL ? 'تحويل دفعة عميل (برج الأمل)' : 'Client Inflow (Al-Amal)'}</span>
                                                <strong style={{ color: '#10b981' }}>+450,000 EGP</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(239, 68, 68, 0.04)', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.15)' }}>
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
                                    <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 18px' }}>
                                        <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>
                                            {isRTL ? 'سلسلة الموافقات والصلاحيات التلقائية' : 'Configurable Approval Thresholds'}
                                        </h3>
                                        <p style={{ color: 'var(--landing-text-muted)', fontSize: '0.88rem' }}>
                                            {isRTL
                                                ? 'حدد سقف الاعتماد المالي لكل دور هندسي لمنع الصرف غير المصرح به وضمان التدقيق المحاسبي.'
                                                : 'Enforce approval limits by amount. Move the slider to test threshold routing.'}
                                        </p>
                                    </div>

                                    {/* Slider */}
                                    <div style={{ maxWidth: 480, margin: '0 auto 18px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: 12, border: '1px solid var(--landing-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontWeight: 700 }}>
                                            <span style={{ fontSize: '0.85rem' }}>{isRTL ? 'قيمة المصروف التجريبي:' : 'Sample Expense Amount:'}</span>
                                            <span style={{ color: '#f97316', fontSize: '1.15rem', fontWeight: 900 }}>{currency(previewAmount)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1000"
                                            max="150000"
                                            step="1000"
                                            value={previewAmount}
                                            onChange={(e) => setPreviewAmount(Number(e.target.value))}
                                            style={{ width: '100%', accentColor: '#f97316', cursor: 'pointer' }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--landing-text-subtle)', marginTop: 4 }}>
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
                                                maxWidth: 480,
                                                margin: '0 auto',
                                                background: 'rgba(13, 19, 31, 0.85)',
                                                border: `1px solid ${approver.color}`,
                                                borderRadius: 12,
                                                padding: '14px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--landing-text-muted)', marginBottom: 2 }}>
                                                    {isRTL ? 'المسؤول المطلوب للاعتماد:' : 'Required Approval Authority:'}
                                                </div>
                                                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: approver.color, marginBottom: 2 }}>
                                                    {approver.role}
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
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

                {/* ---------- 4. Pain Points: Before vs After (Bento Style) ---------- */}
                <section id="pain" className="landing-preview-section" style={{ paddingTop: '2.5rem' }}>
                    <div className="landing-section-header">
                        <span className="landing-section-tag">{t('landing.pain.tag', 'Why Hesaby ERP?')}</span>
                        <h2 className="landing-section-title">
                            {t('landing.pain.title', 'Contractor Bottlenecks Solved for Good')}
                        </h2>
                    </div>

                    {/* Elevated Glass Tray Container Behind All Cards */}
                    <div className="max-w-6xl mx-auto mt-10 rounded-3xl p-5 sm:p-8 bg-slate-900/60 border border-white/15 backdrop-blur-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)] relative overflow-hidden">
                        {/* Ambient diffuse backlights */}
                        <div className="absolute -top-20 -left-20 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute top-1/3 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 left-1/4 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <BentoCard
                                eyebrow={
                                    <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-rose-400 font-semibold">
                                        <Receipt className="w-3.5 h-3.5" />
                                        {isRTL ? 'المستندات الورقية' : 'Paper Invoices'}
                                    </span>
                                }
                                title={t('landing.pain.p1Title', 'Lost & Ruined Paper Receipts')}
                                description={t('landing.pain.p1Desc', 'Paper invoices get destroyed in dusty site pockets before Friday payroll. With Hesaby, snap a photo or upload a PDF; AI extracts vendor and items immediately.')}
                                graphic={
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-950 to-rose-950/50 p-6 flex items-center justify-center">
                                        <div className="w-full max-w-xs bg-slate-800/90 border-2 border-rose-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                                                <span className="text-xs font-mono text-rose-300 flex items-center gap-1 font-semibold">
                                                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> {isRTL ? 'فاتورة تالفة في الجيب' : 'Damaged Receipt'}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">SITE POCKET #4</span>
                                            </div>
                                            <p className="text-xs text-slate-300 font-mono">{isRTL ? '14,200 ج.م حديد مشرشر غير مقيد قبل تصفية الجمعة' : '14,200 EGP unrecorded rebar before Friday cutoff'}</p>
                                        </div>
                                    </div>
                                }
                                fade={["bottom"]}
                                className="border-rose-500/30 hover:border-rose-400/80 shadow-[0_12px_36px_rgba(244,63,94,0.12)]"
                            />

                            <BentoCard
                                eyebrow={
                                    <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-400 font-semibold">
                                        <FileSpreadsheet className="w-3.5 h-3.5" />
                                        {isRTL ? 'تضارب الشيتات' : 'Spreadsheet Drift'}
                                    </span>
                                }
                                title={t('landing.pain.p2Title', 'Excel Spreadsheet Chaos')}
                                description={t('landing.pain.p2Desc', 'Site engineers use v3.xlsx while the office uses v5.xlsx and the bank statement matches neither. Hesaby unifies everything in real-time.')}
                                graphic={
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-950 to-amber-950/50 p-6 flex items-center justify-center">
                                        <div className="w-full max-w-xs bg-slate-800/90 border-2 border-amber-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                                                <span className="text-xs font-mono text-amber-300 font-semibold">v3_final_revised.xlsx</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">OUT OF SYNC</span>
                                            </div>
                                            <p className="text-xs text-slate-300 font-mono">{isRTL ? 'فرق 230,000 ج.م بين الموقع وخزينة المكتب' : '230,000 EGP discrepancy vs Office Safe'}</p>
                                        </div>
                                    </div>
                                }
                                fade={["bottom"]}
                                className="border-amber-500/30 hover:border-amber-400/80 shadow-[0_12px_36px_rgba(245,158,11,0.12)]"
                            />

                            <BentoCard
                                eyebrow={
                                    <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-sky-400 font-semibold">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        {isRTL ? 'صلاحيات الاعتماد' : 'Authorization'}
                                    </span>
                                }
                                title={t('landing.pain.p3Title', 'WhatsApp Approval Amnesia')}
                                description={t('landing.pain.p3Desc', 'Who authorized that 150,000 EGP cement delivery? Nobody remembers. Hesaby enforces role-based approval thresholds with immutable audit logs.')}
                                graphic={
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-950 to-sky-950/50 p-6 flex items-center justify-center">
                                        <div className="w-full max-w-xs bg-slate-800/90 border-2 border-sky-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                                                <span className="text-xs font-mono text-sky-300 flex items-center gap-1 font-semibold">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {isRTL ? 'سجل تدقيق رسمي' : 'Audit Trail Sign-off'}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold">148.251.171.147</span>
                                            </div>
                                            <p className="text-xs text-slate-300 font-mono">{isRTL ? 'معتمد من مدير المشروع · الساعة 10:14 ص' : 'Signed by Project Manager · 10:14 AM'}</p>
                                        </div>
                                    </div>
                                }
                                fade={["bottom"]}
                                className="border-sky-500/30 hover:border-sky-400/80 shadow-[0_12px_36px_rgba(56,189,248,0.12)]"
                            />

                            <BentoCard
                                eyebrow={
                                    <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-orange-400 font-semibold">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        {isRTL ? 'أرباح الإشراف' : 'Management Fee'}
                                    </span>
                                }
                                title={t('landing.pain.p4Title', 'Leaking Management & Supervision Fees')}
                                description={t('landing.pain.p4Desc', 'Discovering 6 months later that your cost-plus margin collapsed. The V1.2 Profit Engine auto-transfers management fees to office revenue upon approval.')}
                                graphic={
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-950 to-orange-950/50 p-6 flex items-center justify-center">
                                        <div className="w-full max-w-xs bg-slate-800/90 border-2 border-orange-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                                            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                                                <span className="text-xs font-mono text-orange-400 font-semibold">{isRTL ? 'محرك الأرباح التلقائي' : 'Auto Margin Split'}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">+15% LOCKED</span>
                                            </div>
                                            <p className="text-xs text-slate-300 font-mono">{isRTL ? 'تحويل فوري إلى خزينة المكتب لحظة الاعتماد' : 'Instant allocation to Office Safe'}</p>
                                        </div>
                                    </div>
                                }
                                fade={["bottom"]}
                                className="border-orange-500/30 hover:border-orange-400/80 shadow-[0_12px_36px_rgba(249,115,22,0.12)]"
                            />
                        </div>
                    </div>
                </section>

                {/* ---------- 5. Core Platform Modules (Hesaby Bento Grid) ---------- */}
                <div id="modules">
                    <HesabyBentoGrid isAr={isRTL} />
                </div>

                {/* ---------- 6. Mobile Companion App Showcase ---------- */}
                <section className="landing-preview-section" style={{ paddingTop: '1.5rem' }}>
                    <div style={{
                        background: 'rgba(13, 19, 31, 0.7)',
                        border: '1px solid var(--landing-border)',
                        borderRadius: '20px',
                        padding: '3rem 2rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '2.5rem',
                        alignItems: 'center'
                    }}>
                        <div>
                            <span className="landing-section-tag">{t('landing.mobile.tag', 'Mobile Companion')}</span>
                            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', lineHeight: 1.25, margin: '8px 0 16px' }}>
                                {t('landing.mobile.title', 'Enterprise Power in Your Pocket')}
                            </h2>
                            <p style={{ color: 'var(--landing-text-muted)', fontSize: '0.98rem', lineHeight: 1.65, marginBottom: '1.75rem' }}>
                                {t('landing.mobile.desc', 'Built specifically for tough construction site environments. Ultra-high-contrast Field Mode ensures readability under harsh sunlight with instant offline expense queuing.')}
                            </p>

                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--landing-border)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Smartphone size={24} style={{ color: '#10b981' }} />
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--landing-text-subtle)', fontWeight: 700 }}>EXPO / REACT NATIVE</div>
                                        <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.88rem' }}>iOS & Android APK</div>
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--landing-border)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Zap size={24} style={{ color: '#f97316' }} />
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--landing-text-subtle)', fontWeight: 700 }}>OFFLINE QUEUE</div>
                                        <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.88rem' }}>Auto-Sync on Wi-Fi</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Minimalist Phone Mockup */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                                width: 280,
                                height: 490,
                                background: '#080c14',
                                border: '2px solid rgba(255,255,255,0.12)',
                                borderRadius: 36,
                                padding: 10,
                                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.8)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ width: 70, height: 14, background: '#1e293b', borderRadius: 999, margin: '0 auto 10px' }}></div>
                                <div style={{ background: '#0f172a', borderRadius: 24, flexGrow: 1, padding: 12, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.84rem' }}>Hesaby Field</span>
                                            <span style={{ fontSize: '0.65rem', color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 6px', borderRadius: 4 }}>ONLINE</span>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: 8, borderRadius: 8, marginBottom: 8, fontSize: '0.78rem' }}>
                                            <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Project Safe</div>
                                            <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>2,450,000 EGP</div>
                                        </div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>Recent Site Expenses</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.72rem' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 7, borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Cairo Ready-Mix</span>
                                                <strong style={{ color: '#ef4444' }}>-24,500</strong>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 7, borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Rebar Batch #12</span>
                                                <strong style={{ color: '#ef4444' }}>-85,000</strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto',
                                        boxShadow: '0 6px 16px rgba(234,88,12,0.4)'
                                    }}>
                                        <Camera size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------- 7. Industry Supply Chain Ribbon ---------- */}
                <div className="landing-industry-ribbon">
                    <div className="landing-industry-item">
                        <Layers size={16} style={{ color: '#f97316' }} />
                        <span>Steel & Rebar (حديد التسليح)</span>
                    </div>
                    <div className="landing-industry-item">
                        <Building2 size={16} style={{ color: '#38bdf8' }} />
                        <span>Ready-Mix Concrete (الخرسانة الجاهزة)</span>
                    </div>
                    <div className="landing-industry-item">
                        <HardHat size={16} style={{ color: '#f59e0b' }} />
                        <span>Heavy Equipment & Fuel (معدات ووقود)</span>
                    </div>
                    <div className="landing-industry-item">
                        <Award size={16} style={{ color: '#10b981' }} />
                        <span>MEP & Finishing (تشطيبات وكهروميكانيك)</span>
                    </div>
                </div>

                {/* ---------- 8. Pricing Section ---------- */}
                <section id="pricing" className="landing-preview-section">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">{t('landing.pricing.tag', 'Transparent & Fair Pricing')}</span>
                        <h2 className="landing-section-title">
                            {t('landing.pricing.title', 'Invest in Operational Clarity')}
                        </h2>
                        <p style={{ color: 'var(--landing-text-muted)', fontSize: '0.98rem', marginTop: 8 }}>
                            {t('landing.pricing.subtitle', 'Start free forever. Scale your subscription as your engineering projects expand.')}
                        </p>

                        {/* Billing cycle switch */}
                        <div className="landing-pricing-toggle" style={{ marginTop: '1.5rem' }}>
                            <div className="toggle-switch-pill">
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                                >
                                    {t('landing.pricing.monthly', 'Monthly')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle('annual')}
                                    className={`toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    <span>{t('landing.pricing.annual', 'Annually')}</span>
                                    <span className="annual-discount-pill">-20%</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="landing-pricing-grid">
                        {plans.map(plan => {
                            const isPopular = plan.popular || plan.key === 'PREMIUM';
                            const isEnterprise = plan.key === 'ENTERPRISE' || plan.isCustom || plan.priceEgp === null;
                            const isFree = !isEnterprise && (plan.priceEgp === 0 || plan.key === 'FREE');
                            const multiplier = billingCycle === 'annual' ? 0.8 : 1;
                            const price = !isEnterprise && plan.priceEgp !== null ? Math.round(plan.priceEgp * multiplier) : null;
                            const displayName = (isRTL && plan.nameAr) ? plan.nameAr : plan.name;
                            const displayFeatures = (isRTL && plan.featuresAr) ? plan.featuresAr : (plan.features || []);
                            
                            const userPlanKey = (user?.company?.subscriptionPlan || user?.subscriptionPlan || 'FREE').toUpperCase();
                            const isCurrentPlan = !!user && userPlanKey === (plan.key || '').toUpperCase();

                            return (
                                <div key={plan.key} className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#0d121f]/90 border ${isPopular ? 'border-orange-500/60 [box-shadow:0_-20px_80px_-20px_rgba(249,115,22,0.25)_inset] ring-1 ring-orange-500/30' : 'border-white/10 [box-shadow:0_-20px_80px_-20px_rgba(249,115,22,0.08)_inset] ring-1 ring-white/10'} p-7 transition-all duration-300 hover:border-white/25`}>
                                    {isPopular && (
                                        <div className="popular-badge">
                                            {t('landing.pricing.popular', 'MOST POPULAR')}
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="pricing-title">{displayName}</h3>

                                        <div style={{ marginBottom: '1.25rem' }}>
                                            {isEnterprise ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8' }}>
                                                        {isRTL ? 'تسعير مخصص' : 'Custom Pricing'}
                                                    </span>
                                                    <span style={{ fontSize: '0.78rem', color: 'var(--landing-text-subtle)' }}>
                                                        {isRTL ? 'حسب حجم الشركة والمشاريع' : 'Tailored for your organization'}
                                                    </span>
                                                </div>
                                            ) : isFree ? (
                                                <span style={{ fontSize: '1.85rem', fontWeight: 900, color: '#10b981' }}>
                                                    {t('landing.pricing.free', 'Free')}
                                                </span>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                    <span className="pricing-amount">{currency(price)}</span>
                                                    <span style={{ fontSize: '0.82rem', color: 'var(--landing-text-subtle)' }}> / {isRTL ? 'شهرياً' : 'month'}</span>
                                                </div>
                                            )}
                                        </div>

                                        <ul className="pricing-features">
                                            {displayFeatures.map((feat, idx) => (
                                                <li key={idx} className="pricing-feature-item">
                                                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                                    <span>{feat}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {isEnterprise ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: 'auto' }}>
                                            <a
                                                href={`https://mail.google.com/mail/?view=cm&fs=1&to=nooraldeenahmed04@gmail.com&su=${encodeURIComponent(isRTL ? 'استفسار عن باقة الشركات Enterprise - نظام حسابي ERP' : 'Hesaby ERP Enterprise Plan Inquiry')}&body=${encodeURIComponent(isRTL ? 'مرحباً فريق مبيعات حسابي، نود الاستفسار عن باقة الشركات الكبرى (Enterprise) وتفاصيل الاشتراك المخصص لشركتنا.' : 'Hello Hesaby Sales Team, We would like to inquire about the Enterprise Plan and custom quotation for our organization.')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ width: '100%' }}
                                            >
                                                <FlowButton 
                                                    variant="light" 
                                                    text={isRTL ? 'مراسلة المبيعات' : 'Email Sales'} 
                                                    className="w-full justify-center"
                                                />
                                            </a>
                                            <a
                                                href={`https://wa.me/201092041908?text=${encodeURIComponent(isRTL ? 'مرحباً، أود الاستفسار عن باقة الشركات الكبرى (Enterprise) لنظام حسابي ERP' : "Hello, I'm interested in Hesaby ERP Enterprise Plan")}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ width: '100%' }}
                                            >
                                                <FlowButton 
                                                    variant="hesaby" 
                                                    text={isRTL ? 'واتساب المبيعات' : 'WhatsApp Sales'} 
                                                    className="w-full justify-center"
                                                />
                                            </a>
                                        </div>
                                    ) : isCurrentPlan ? (
                                        <Link
                                            to="/billing"
                                            style={{ width: '100%', marginTop: 'auto' }}
                                        >
                                            <FlowButton 
                                                variant="light" 
                                                text={t('landing.pricing.current', 'Current Plan')} 
                                                className="w-full justify-center !border-emerald-500/50 !text-emerald-400"
                                            />
                                        </Link>
                                    ) : (
                                        <Link
                                            to={user ? '/billing' : '/signup'}
                                            style={{ width: '100%', marginTop: 'auto' }}
                                        >
                                            <FlowButton 
                                                variant={isPopular ? "hesaby" : "light"}
                                                text={isFree
                                                    ? t('landing.startPilot', 'Start Free')
                                                    : (user ? t('landing.pricing.upgrade', 'Upgrade Plan') : t('landing.pricing.choose', 'Choose Plan'))}
                                                className="w-full justify-center"
                                            />
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ---------- 9. Final Call to Action ---------- */}
                <section className="landing-preview-section" style={{ paddingBottom: '4rem' }}>
                    <div style={{
                        padding: '3.5rem 2rem',
                        textAlign: 'center',
                        background: 'linear-gradient(180deg, rgba(249, 115, 22, 0.08) 0%, rgba(13, 19, 31, 0.95) 100%)',
                        border: '1px solid rgba(249, 115, 22, 0.25)',
                        borderRadius: '24px',
                        boxShadow: '0 20px 50px -15px rgba(0,0,0,0.7)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.25rem',
                            boxShadow: '0 4px 16px rgba(249,115,22,0.4)'
                        }}>
                            <Building2 size={26} />
                        </div>

                        <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                            {t('landing.cta.title', 'Ready to Transform Your Engineering Operations?')}
                        </h2>

                        <p style={{ color: 'var(--landing-text-muted)', fontSize: '1.02rem', maxWidth: 640, margin: '0 auto 2rem', lineHeight: 1.65 }}>
                            {t('landing.cta.subtitle', 'Join leading contractors and engineering consultancies operating with speed and precision on Hesaby ERP.')}
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link to={user ? '/dashboard' : '/signup'}>
                                <FlowButton
                                    variant="hesaby"
                                    text={user ? t('landing.nav.openApp', 'Open Dashboard') : t('landing.cta.button', 'Start Your Free Pilot Now')}
                                />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* ---------- 10. Minimalist Footer ---------- */}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={18} style={{ color: '#f97316' }} />
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.98rem' }}>Hesaby ERP</span>
                        <span>— Enterprise Construction Platform</span>
                    </div>

                    <div>
                        <span>{isRTL ? `جميع الحقوق محفوظة © ${new Date().getFullYear()} حسابي ERP` : `© ${new Date().getFullYear()} Hesaby ERP · All rights reserved.`}</span>
                    </div>
                </div>
            </footer>
        </div>
    </KineticGrid>
    );
}
