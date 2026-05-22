import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { billingAPI } from '../services/api';
import { useFormat } from '../utils/format';

// Inline icon helper using Material Symbols
const Icon = ({ name, fill, className = '', size = 24 }) => (
    <span
        className={`material-symbols-outlined ${className}`}
        style={{
            fontSize: `${size}px`,
            fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0"
        }}
    >
        {name}
    </span>
);

const HesabyLogo = ({ className = "" }) => (
    <div className={`flex items-center gap-4 ${className}`}>
        <img 
            src="/hesaby_logo_icon.png" 
            alt="Hesaby Icon" 
            className="h-16 object-contain drop-shadow-sm" 
        />
        <img 
            src="/hesaby_logo_typography.png" 
            alt="Hesaby Typography" 
            className="h-16 object-contain drop-shadow-sm" 
        />
    </div>
);

export default function Landing() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { currency } = useFormat();
    const [plans, setPlans] = useState([]);
    const isRTL = i18n.language === 'ar';

    useEffect(() => {
        billingAPI.listPlans()
            .then(r => setPlans(r.data.data || []))
            .catch(() => { /* page still renders without prices */ });
    }, []);

    const toggleLang = () => i18n.changeLanguage(isRTL ? 'en' : 'ar');

    const ctaTo = user ? '/dashboard' : '/signup';
    const ctaLabel = user
        ? t('landing.openApp', 'Open App')
        : t('landing.startFree', 'Start Your Free Pilot');

    return (
        <div
            className="bg-[#F8F9FA] text-hesaby-navy min-h-screen flex flex-col selection:bg-hesaby-teal/30 selection:text-hesaby-navy overflow-x-hidden relative font-sans"
            style={{ fontFamily: isRTL ? 'Cairo, system-ui, sans-serif' : '"General Sans", Inter, system-ui, sans-serif' }}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* Global architectural grid background - CONTINUOUS */}
            <div className="fixed inset-0 pointer-events-none z-0" style={{
                backgroundImage: 'linear-gradient(rgba(11, 27, 61, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(11, 27, 61, 0.04) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }}></div>

            {/* ---------- Top Nav ---------- */}
            <header className="bg-[#F8F9FA]/80 backdrop-blur-md border-b border-gray-200 w-full sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center px-margin-desktop py-md">
                    <HesabyLogo className="scale-75 origin-left" />
                    
                    <div className="flex items-center gap-md">
                        <button
                            onClick={toggleLang}
                            className="font-body-sm text-body-sm text-gray-500 hover:text-hesaby-navy transition-colors flex items-center gap-xs font-bold tracking-wider"
                        >
                            <Icon name="translate" size={18} />
                            {isRTL ? 'EN' : 'AR'}
                        </button>
                        {user ? (
                            <Link
                                to="/dashboard"
                                className="bg-hesaby-navy text-white px-lg py-sm rounded font-body-sm text-body-sm font-bold shadow-md hover:bg-hesaby-navy-light transition-colors"
                            >
                                {t('landing.openApp', 'Open App')}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="font-body-sm text-body-sm text-gray-500 hover:text-hesaby-navy transition-colors font-bold"
                                >
                                    {t('landing.signIn', 'Sign in')}
                                </Link>
                                <Link
                                    to="/signup"
                                    className="bg-hesaby-navy text-white px-lg py-sm rounded font-body-sm text-body-sm font-bold shadow-md hover:bg-hesaby-navy-light transition-colors"
                                >
                                    {t('landing.startFree', 'Start Your Free Pilot')}
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col relative z-10">
                {/* ---------- Hero ---------- */}
                <section className="w-full py-24 px-margin-desktop relative">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-xl animate-fade-in-up">
                        <div className="flex-1 flex flex-col gap-lg items-start max-w-2xl relative z-10">
                            <span className="inline-flex items-center gap-xs bg-white text-hesaby-teal border border-gray-200 px-md py-xs rounded-full text-label-caps font-bold tracking-widest shadow-sm">
                                <Icon name="bolt" size={16} fill />
                                {t('landing.tagline', 'Built for Egyptian construction firms')}
                            </span>
                            <h1
                                className="font-extrabold text-hesaby-navy"
                                style={{ fontSize: 'clamp(44px, 5vw, 76px)', lineHeight: 1.1, letterSpacing: '-0.03em' }}
                            >
                                {t('landing.heroTitle', 'Your voice, instantly logged.')}
                            </h1>
                            <p className="font-medium text-lg text-gray-600 max-w-xl">
                                {t('landing.heroSub', 'The AI-powered Construction ERP for Egypt. Turn voice notes and photos into perfectly reconciled ledgers. Say it, snap it, log it.')}
                            </p>
                            <div className="flex gap-md mt-sm flex-wrap w-full">
                                <Link
                                    to={ctaTo}
                                    className="bg-hesaby-orange text-white px-xl py-md rounded font-bold text-lg shadow-[0_8px_20px_rgba(255,90,54,0.3)] hover:bg-[#ff7052] transition-transform hover:-translate-y-1 flex items-center gap-sm"
                                >
                                    {ctaLabel}
                                    <Icon name="arrow_forward" size={20} />
                                </Link>
                                <a
                                    href="#features"
                                    className="bg-white text-hesaby-navy border border-gray-200 px-xl py-md rounded font-bold text-lg hover:bg-gray-50 transition-colors flex items-center gap-sm shadow-sm"
                                >
                                    <Icon name="play_arrow" size={20} fill />
                                    {t('landing.seeFeatures', 'See what it does')}
                                </a>
                            </div>
                            <div className="mt-lg flex items-center gap-sm text-gray-500 font-bold text-sm">
                                <Icon name="verified" size={18} className="text-hesaby-teal" fill />
                                {t('landing.freemiumNote', 'Free forever for 1 project · No credit card required')}
                            </div>
                        </div>

                        {/* Hero illustration: High-Contrast Logo presentation */}
                        <div className="flex-1 w-full max-w-xl relative flex justify-center items-center">
                            <div className="bg-white rounded-2xl p-12 shadow-[0_20px_60px_rgba(11,27,61,0.08)] border border-gray-100 flex flex-col items-center justify-center transform rotate-1 hover:rotate-0 transition-transform">
                                <HesabyLogo className="scale-125" />
                            </div>
                            {/* Decorative element */}
                            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-hesaby-teal/5 blur-[100px] rounded-full"></div>
                        </div>
                    </div>
                </section>

                {/* ---------- Pain points (Floating Cards on Grid) ---------- */}
                <section className="w-full py-20 px-margin-desktop relative">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="font-extrabold text-3xl text-hesaby-navy text-center mb-xl">
                            {t('landing.painTitle', 'Sound familiar?')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                            {[
                                { i: 'receipt_long', t: t('landing.pain1', 'Lost Receipts'), s: t('landing.pain1Sub', "Engineers stuff them in pockets. Rain and dust ruin them before Friday payroll.") },
                                { i: 'sync_problem', t: t('landing.pain2', 'Excel Chaos'), s: t('landing.pain2Sub', 'Site uses v3.xlsx, office uses v5.xlsx. The bank matches neither.') },
                                { i: 'chat_error', t: t('landing.pain3', 'WhatsApp Approvals'), s: t('landing.pain3Sub', 'Who approved the 200,000 EGP payment? Nobody knows. The project stalls.') },
                                { i: 'trending_down', t: t('landing.pain4', 'Blind Margins'), s: t('landing.pain4Sub', "You assume a 10% margin on cost-plus. You discover it's 4% three months too late.") }
                            ].map((p, i) => (
                                <div key={i} className="bg-white border border-gray-200 shadow-sm rounded-xl p-lg flex flex-col gap-sm hover:border-hesaby-teal/50 hover:shadow-lg transition-all transform hover:-translate-y-1">
                                    <div className="w-12 h-12 rounded-lg bg-[#F8F9FA] flex items-center justify-center border border-gray-100 mb-xs">
                                        <Icon name={p.i} size={24} className="text-hesaby-orange" fill />
                                    </div>
                                    <h3 className="font-extrabold text-lg text-hesaby-navy">{p.t}</h3>
                                    <p className="font-medium text-sm text-gray-500 leading-relaxed">{p.s}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ---------- Bento feature grid ---------- */}
                <section id="features" className="w-full py-24 px-margin-desktop relative">
                    <div className="max-w-7xl mx-auto flex flex-col gap-xl">
                        <div className="text-center max-w-2xl mx-auto flex flex-col gap-sm">
                            <h2 className="font-extrabold text-4xl text-hesaby-navy">
                                {t('landing.featuresTitle', 'Built for the Site, Powerful for the Office')}
                            </h2>
                            <p className="font-medium text-lg text-gray-600">
                                {t('landing.featuresSub', 'Bridging the gap between field execution and financial oversight.')}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-md mt-lg">
                            {/* Feature 1 — wide AI Voice */}
                            <div className="col-span-1 md:col-span-2 bg-hesaby-navy rounded-2xl p-xl border border-hesaby-navy-light flex flex-col justify-between hover:border-hesaby-teal transition-colors shadow-xl">
                                <div className="flex flex-col gap-md">
                                    <div className="w-14 h-14 rounded-lg bg-hesaby-teal/20 flex items-center justify-center border border-hesaby-teal/30">
                                        <Icon name="mic" size={28} fill className="text-hesaby-teal" />
                                    </div>
                                    <h3 className="font-extrabold text-3xl text-white">
                                        {t('landing.f1', 'AI Voice & Receipt Capture')}
                                    </h3>
                                    <p className="font-medium text-gray-400 max-w-lg leading-relaxed text-lg">
                                        {t('landing.f1Sub', 'Speak naturally or snap a photo of a receipt. Our AI extracts amounts, vendor names, and project codes — logged directly into your ledger as a draft you confirm in seconds.')}
                                    </p>
                                </div>
                                <div className="mt-xl flex flex-wrap items-center gap-sm font-bold text-xs text-hesaby-navy">
                                    <span className="bg-hesaby-teal px-md py-xs rounded">EGYPTIAN ARABIC</span>
                                    <span className="bg-white px-md py-xs rounded">RECEIPT OCR</span>
                                    <span className="bg-white px-md py-xs rounded">VENDOR MATCH</span>
                                </div>
                            </div>

                            {/* Feature 2 — Arabic */}
                            <div className="col-span-1 bg-white rounded-2xl p-xl border border-gray-200 shadow-md flex flex-col gap-md hover:border-gray-300 transition-colors">
                                <div className="w-14 h-14 rounded-lg bg-[#F8F9FA] flex items-center justify-center border border-gray-100">
                                    <Icon name="translate" size={28} className="text-hesaby-navy" />
                                </div>
                                <h3 className="font-extrabold text-xl text-hesaby-navy">
                                    {t('landing.f2', 'Full Arabic RTL Support')}
                                </h3>
                                <p className="font-medium text-sm text-gray-500 leading-relaxed">
                                    {t('landing.f2Sub', 'A truly native experience. Right-to-left layouts and construction-specific Arabic categories.')}
                                </p>
                            </div>

                            {/* Feature 3 — Profit Engine */}
                            <div className="col-span-1 bg-white rounded-2xl p-xl border border-gray-200 shadow-md flex flex-col gap-md hover:border-hesaby-orange/50 transition-colors">
                                <div className="w-14 h-14 rounded-lg bg-hesaby-orange/10 flex items-center justify-center border border-hesaby-orange/20">
                                    <Icon name="trending_up" size={28} className="text-hesaby-orange" />
                                </div>
                                <h3 className="font-extrabold text-xl text-hesaby-navy">
                                    {t('landing.f3', 'V1.2 Profit Engine')}
                                </h3>
                                <p className="font-medium text-sm text-gray-500 leading-relaxed">
                                    {t('landing.f3Sub', 'Auto-transfers your management fee from project safe to office revenue when expenses approve.')}
                                </p>
                            </div>

                            {/* Feature 4 — wide Invoicing */}
                            <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-xl border border-gray-200 shadow-md flex flex-col md:flex-row gap-xl items-center justify-between overflow-hidden relative">
                                {/* Isometric grid specifically for this card to highlight architectural feel */}
                                <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                                    backgroundImage: 'linear-gradient(rgba(11, 27, 61, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(11, 27, 61, 0.1) 1px, transparent 1px)',
                                    backgroundSize: '20px 20px'
                                }}></div>
                                <div className="flex flex-col gap-md max-w-sm relative z-10">
                                    <div className="w-14 h-14 rounded-lg bg-hesaby-navy flex items-center justify-center shadow-lg">
                                        <Icon name="receipt_long" size={28} className="text-white" />
                                    </div>
                                    <h3 className="font-extrabold text-2xl text-hesaby-navy">
                                        {t('landing.f4', 'Egyptian-VAT Invoicing')}
                                    </h3>
                                    <p className="font-medium text-gray-500 leading-relaxed">
                                        {t('landing.f4Sub', '14% VAT pre-filled. PDF auto-generated with your logo. Email to clients. Track partial payments to PAID.')}
                                    </p>
                                </div>
                                <div className="w-full md:w-64 bg-[#F8F9FA] border border-gray-200 rounded p-md flex flex-col gap-sm shadow-[0_10px_30px_rgba(0,0,0,0.05)] transform rotate-2 relative z-10">
                                    <div className="flex justify-between items-center border-b border-gray-200 pb-xs mb-xs">
                                        <div className="w-6 h-6 bg-hesaby-navy rounded-sm"></div>
                                        <div className="font-bold text-xs text-gray-500">INV-2026-001</div>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 rounded"></div>
                                    <div className="w-3/4 h-2 bg-gray-200 rounded"></div>
                                    <div className="flex justify-between items-end mt-md">
                                        <div className="font-bold text-lg text-hesaby-navy">28,500 EGP</div>
                                        <div className="text-xs bg-hesaby-teal/20 text-hesaby-navy px-2 py-1 rounded font-bold uppercase tracking-wider border border-hesaby-teal/30">Paid</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------- Mobility ---------- */}
                <section className="w-full py-24 px-margin-desktop relative">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-xl items-center">
                        <div className="flex flex-col gap-lg order-2 md:order-1">
                            <div className="w-16 h-16 rounded-xl bg-hesaby-navy text-white flex items-center justify-center shadow-lg">
                                <Icon name="phone_android" size={32} fill />
                            </div>
                            <h2 className="font-extrabold text-4xl text-hesaby-navy" style={{ lineHeight: 1.15 }}>
                                {t('landing.mobileTitle', 'On the site, in the office, on the go.')}
                            </h2>
                            <p className="font-medium text-lg text-gray-600 leading-relaxed">
                                {t('landing.mobileSub', 'Engineers capture from their phones in high-contrast Field Mode. Managers review from the office in Executive Mode. Native Android + iOS apps via Expo.')}
                            </p>
                            <div className="flex gap-md flex-wrap mt-md">
                                <div className="bg-hesaby-navy text-white rounded-lg px-lg py-md flex items-center gap-md hover:bg-hesaby-navy-light transition-colors cursor-pointer shadow-lg transform hover:-translate-y-1">
                                    <Icon name="android" size={32} fill className="text-hesaby-teal" />
                                    <div>
                                        <div className="text-xs text-gray-300 font-bold tracking-wider">GET IT ON</div>
                                        <div className="font-bold text-lg">Google Play</div>
                                    </div>
                                </div>
                                <div className="bg-white text-hesaby-navy border border-gray-200 rounded-lg px-lg py-md flex items-center gap-md hover:bg-gray-50 transition-colors cursor-pointer shadow-lg transform hover:-translate-y-1">
                                    <Icon name="apple" size={32} fill className="text-hesaby-navy" />
                                    <div>
                                        <div className="text-xs text-gray-500 font-bold tracking-wider">{t('landing.downloadOn', 'DOWNLOAD ON THE')}</div>
                                        <div className="font-bold text-lg">App Store</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Flat Minimalist Phone Mockup Floating on Grid */}
                        <div className="flex justify-center relative order-1 md:order-2">
                            <div
                                className="rounded-[40px] p-4 shadow-[0_30px_60px_rgba(11,27,61,0.15)] relative z-10 bg-white border border-gray-200 transform -rotate-2 hover:rotate-0 transition-transform duration-500"
                                style={{ width: 300, height: 600 }}
                            >
                                <div className="bg-[#F8F9FA] rounded-[28px] h-full flex flex-col text-hesaby-navy overflow-hidden relative">
                                    {/* Phone Background pattern */}
                                    <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
                                        backgroundImage: 'linear-gradient(rgba(11, 27, 61, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(11, 27, 61, 1) 1px, transparent 1px)',
                                        backgroundSize: '20px 20px'
                                    }}></div>

                                    <div className="absolute top-0 inset-x-0 h-6 bg-white flex justify-center rounded-t-[28px] z-20">
                                        <div className="w-1/3 h-4 bg-gray-200 rounded-b-xl"></div>
                                    </div>
                                    
                                    <div className="p-md pt-xl flex-grow flex flex-col relative z-10">
                                        <div className="font-extrabold text-xl mb-md mt-sm flex items-center justify-between">
                                            <span>Field Mode</span>
                                            <Icon name="more_horiz" size={20} className="text-gray-400" />
                                        </div>
                                        
                                        <div className="flex flex-col gap-sm">
                                            {[
                                                { name: 'شركة القاهرة للأسمنت', amt: '٢٥٬٠٠٠ ج.م.' },
                                                { name: 'مصنعية بناء — مبنى A', amt: '٨٬٥٠٠ ج.م.' },
                                            ].map((it, i) => (
                                                <div key={i} className="bg-white border border-gray-200 p-sm rounded-lg shadow-sm">
                                                    <div className="font-bold text-sm mb-xs text-hesaby-navy">{it.name}</div>
                                                    <div className="flex justify-between items-center mt-sm">
                                                        <span className="text-sm font-bold text-red-600">{it.amt}</span>
                                                        <span className="text-[10px] font-bold px-2 py-1 bg-yellow-100 text-yellow-800 rounded uppercase tracking-wider">Pending</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Constructor Orange FAB Bottom Center */}
                                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-16 h-16 bg-hesaby-orange rounded-full flex items-center justify-center shadow-[0_12px_24px_rgba(255,90,54,0.4)] text-white z-20 animate-bounce" style={{ animationDuration: '3s' }}>
                                        <Icon name="mic" size={32} fill />
                                    </div>

                                    {/* Bottom Nav Bar */}
                                    <div className="h-16 bg-white border-t border-gray-200 flex justify-around items-center px-sm mt-auto relative z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                                        <Icon name="home" size={24} fill className="text-gray-400" />
                                        <Icon name="receipt_long" size={24} fill className="text-gray-400 mr-8" />
                                        <Icon name="analytics" size={24} className="text-gray-400 ml-8" />
                                        <Icon name="person" size={24} className="text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------- Pricing ---------- */}
                <section id="pricing" className="w-full py-24 px-margin-desktop relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto flex flex-col gap-sm mb-xl">
                            <h2 className="font-extrabold text-4xl text-hesaby-navy">
                                {t('landing.pricingTitle', 'Simple, fair pricing')}
                            </h2>
                            <p className="font-medium text-lg text-gray-600">
                                {t('landing.pricingSub', 'Start free, forever. Upgrade when your team and projects grow.')}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                            {plans.length === 0 ? (
                                <div className="md:col-span-3 text-center font-bold text-gray-400 py-xl flex flex-col items-center gap-md">
                                    <div className="w-8 h-8 border-4 border-hesaby-teal border-t-transparent rounded-full animate-spin"></div>
                                    {t('landing.pricingLoading', 'Loading pricing…')}
                                </div>
                            ) : plans.map(plan => {
                                const isPopular = plan.key === 'BASIC';
                                return (
                                    <div
                                        key={plan.key}
                                        className={`relative bg-white rounded-2xl p-xl flex flex-col gap-lg transition-all transform hover:-translate-y-2 ${isPopular ? 'border-2 border-hesaby-teal shadow-[0_20px_50px_rgba(0,240,181,0.15)] z-10' : 'border border-gray-200 shadow-md'}`}
                                    >
                                        {isPopular && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-hesaby-teal text-hesaby-navy font-bold text-xs px-lg py-2 rounded-full shadow-lg tracking-wider">
                                                {t('landing.popular', 'MOST POPULAR')}
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-xs mt-sm">
                                            <h3 className="font-bold text-xl text-gray-500">{plan.name}</h3>
                                            <div className="flex items-baseline gap-xs">
                                                <span className="font-extrabold text-4xl text-hesaby-navy">
                                                    {plan.priceEgp > 0 ? currency(plan.priceEgp) : t('landing.free', 'Free')}
                                                </span>
                                                {plan.priceEgp > 0 && (
                                                    <span className="font-medium text-sm text-gray-500">
                                                        / {t('billing.month', 'month')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="w-full h-[1px] bg-gray-100"></div>
                                        
                                        <ul className="flex flex-col gap-md flex-grow">
                                            {plan.features.map((f, i) => (
                                                <li key={i} className="flex items-start gap-sm font-medium text-gray-600">
                                                    <Icon name="check_circle" size={20} fill className={`${isPopular ? 'text-hesaby-teal' : 'text-gray-400'} flex-shrink-0`} />
                                                    <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link
                                            to={user ? '/billing' : '/signup'}
                                            className={`mt-md block text-center px-lg py-md rounded-lg font-bold transition-all ${isPopular ? 'bg-hesaby-navy text-white shadow-[0_8px_20px_rgba(11,27,61,0.3)] hover:bg-hesaby-navy-light hover:shadow-[0_12px_25px_rgba(11,27,61,0.4)]' : 'bg-[#F8F9FA] text-hesaby-navy border border-gray-200 hover:bg-gray-100'}`}
                                        >
                                            {plan.priceEgp === 0
                                                ? t('landing.startFree', 'Start free')
                                                : (user ? t('landing.upgradeNow', 'Upgrade now') : t('landing.choosePlan', 'Choose this plan'))}
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ---------- Final CTA ---------- */}
                <section className="w-full py-24 px-margin-desktop bg-hesaby-navy relative border-t border-gray-200 mt-xl">
                    <div className="absolute inset-0 pointer-events-none opacity-5" style={{
                        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}></div>
                    <div className="max-w-3xl mx-auto flex flex-col gap-lg items-center relative z-10 text-center">
                        <div className="w-16 h-16 bg-white text-hesaby-orange flex items-center justify-center rounded-xl shadow-lg font-bold mb-md">
                            <Icon name="bolt" size={32} fill />
                        </div>
                        <h2 className="font-extrabold text-white" style={{ fontSize: 'clamp(36px, 4vw, 48px)', lineHeight: 1.15 }}>
                            {t('landing.ctaTitle', 'Get your first project on board this week.')}
                        </h2>
                        <p className="font-medium text-lg text-gray-300 max-w-xl">
                            {t('landing.ctaSub', 'Sign up takes 60 seconds. Free forever for 1 project. No credit card.')}
                        </p>
                        <Link
                            to={ctaTo}
                            className="bg-hesaby-orange text-white px-xl py-lg rounded-lg font-bold text-lg shadow-[0_8px_24px_rgba(255,90,54,0.4)] hover:bg-[#ff7052] transition-transform hover:-translate-y-1 flex items-center gap-sm mt-md"
                        >
                            {ctaLabel}
                            <Icon name="arrow_forward" size={24} />
                        </Link>
                    </div>
                </section>
            </main>

            {/* ---------- Footer ---------- */}
            <footer className="bg-[#060f22] border-t border-white/5 py-xl px-margin-desktop text-center text-gray-500 font-medium text-sm relative z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-md">
                    <div className="flex items-center gap-sm text-white font-extrabold text-xl tracking-tight">
                        Hesaby.ai
                    </div>
                    <div>
                        © {new Date().getFullYear()} Hesaby.ai / Engineers Management.{' '}
                        <a
                            href="https://github.com/8ofry/Engineers-Management"
                            className="text-hesaby-teal hover:underline transition-colors ml-xs"
                        >
                            GitHub
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
