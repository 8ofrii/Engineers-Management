import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { billingAPI } from '../services/api';
import { useFormat } from '../utils/format';

// Phase B — public marketing landing page using the new Tailwind + Material 3
// design system from website design.txt. Sections: top nav → hero → pain
// points → bento feature grid → mobility → pricing (live from API) → CTA →
// footer. Bilingual + auth-aware ("Open App" for logged-in users, "Start free"
// for guests). Material Symbols replace lucide-react throughout.
//
// Tailwind preflight is OFF (see tailwind.config.js) so this page coexists
// with the legacy app — no risk to other screens.

// Inline icon helper. Material Symbols is loaded via index.html so we just
// emit the right text content with the variation-axis font CSS class.
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
            className="bg-background text-on-background min-h-screen flex flex-col"
            style={{ fontFamily: isRTL ? 'Cairo, system-ui, sans-serif' : 'Inter, system-ui, sans-serif' }}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* ---------- Top Nav ---------- */}
            <header className="bg-surface-container-lowest border-b border-outline-variant w-full sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center px-margin-desktop py-md">
                    <div className="flex items-center gap-sm font-h3 text-h3 text-primary">
                        <Icon name="domain" size={28} fill />
                        <span>Engineers Management</span>
                    </div>
                    <div className="flex items-center gap-md">
                        <button
                            onClick={toggleLang}
                            className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-xs"
                        >
                            <Icon name="translate" size={16} />
                            {isRTL ? 'EN' : 'AR'}
                        </button>
                        {user ? (
                            <Link
                                to="/dashboard"
                                className="bg-primary text-on-primary px-lg py-sm rounded font-body-sm text-body-sm hover:opacity-90 transition-opacity"
                            >
                                {t('landing.openApp', 'Open App')}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
                                >
                                    {t('landing.signIn', 'Sign in')}
                                </Link>
                                <Link
                                    to="/signup"
                                    className="bg-primary text-on-primary px-lg py-sm rounded font-body-sm text-body-sm hover:opacity-90 transition-opacity"
                                >
                                    {t('landing.startFree', 'Start Your Free Pilot')}
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col">
                {/* ---------- Hero ---------- */}
                <section className="w-full bg-surface-container-low py-20 px-margin-desktop">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-xl">
                        <div className="flex-1 flex flex-col gap-lg items-start max-w-2xl">
                            <span className="inline-flex items-center gap-xs bg-primary-container/10 text-primary px-md py-xs rounded-full text-label-caps font-label-caps">
                                <Icon name="construction" size={14} fill />
                                {t('landing.tagline', 'Built for Egyptian construction firms')}
                            </span>
                            <h1
                                className="font-h1 text-on-surface font-bold"
                                style={{ fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.1 }}
                            >
                                {t('landing.heroTitle', 'Never Lose a Single Record Again.')}
                            </h1>
                            <p className="font-body-lg text-body-lg text-on-surface-variant">
                                {t('landing.heroSub', 'The first AI-powered Construction ERP built specifically for Egyptian engineering firms. Say it, snap it, log it.')}
                            </p>
                            <div className="flex gap-md mt-sm flex-wrap">
                                <Link
                                    to={ctaTo}
                                    className="bg-primary text-on-primary px-xl py-md rounded font-body-md text-body-md hover:opacity-90 transition-opacity flex items-center gap-sm shadow-sm"
                                >
                                    {ctaLabel}
                                    <Icon name="arrow_forward" size={18} />
                                </Link>
                                <a
                                    href="#features"
                                    className="bg-surface-container-lowest text-primary border border-outline-variant px-xl py-md rounded font-body-md text-body-md hover:bg-surface-variant transition-colors flex items-center gap-sm"
                                >
                                    <Icon name="play_circle" size={18} fill />
                                    {t('landing.seeFeatures', 'See what it does')}
                                </a>
                            </div>
                            <div className="mt-lg flex items-center gap-sm text-on-surface-variant font-body-sm text-body-sm">
                                <Icon name="verified" size={16} className="text-primary" fill />
                                {t('landing.freemiumNote', 'Free forever for 1 project · No credit card required · Arabic + English')}
                            </div>
                        </div>

                        {/* Hero illustration: stacked phone mockups (CSS-only) */}
                        <div className="flex-1 w-full max-w-xl relative">
                            <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-lg border border-outline-variant bg-surface-container-lowest relative">
                                <div
                                    className="w-full h-full"
                                    style={{
                                        background: 'linear-gradient(135deg, #2563eb 0%, #004ac6 50%, #1e3a8a 100%)'
                                    }}
                                />
                                {/* Floating "voice capture" overlay */}
                                <div className="absolute bottom-md right-md bg-surface-container-lowest/95 backdrop-blur-sm p-md rounded shadow-sm border border-outline-variant flex items-center gap-md">
                                    <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                                        <Icon name="mic" size={20} fill className="text-on-primary" />
                                    </div>
                                    <div>
                                        <div className="font-body-sm text-body-sm font-semibold text-on-surface">
                                            {t('landing.heroBadgeTitle', 'Voice Capture Active')}
                                        </div>
                                        <div className="font-label-caps text-label-caps text-on-surface-variant">
                                            {t('landing.heroBadgeSub', 'Logging material receipt…')}
                                        </div>
                                    </div>
                                </div>
                                {/* Floating draft preview */}
                                <div className="absolute top-md left-md bg-surface-container-lowest/95 backdrop-blur-sm p-md rounded shadow-sm border border-outline-variant max-w-[220px]">
                                    <div className="flex items-center gap-xs mb-xs">
                                        <Icon name="auto_awesome" size={14} className="text-primary" fill />
                                        <span className="font-label-caps text-label-caps text-primary">
                                            {t('landing.heroChip', 'AI DRAFT READY')}
                                        </span>
                                    </div>
                                    <div className="font-body-sm text-body-sm text-on-surface">
                                        {isRTL ? '٢٥٬٠٠٠ ج.م.' : 'EGP 25,000'}
                                    </div>
                                    <div className="font-label-caps text-label-caps text-on-surface-variant">
                                        {isRTL ? 'أسمنت بورتلاندي' : 'Cement Portland — 50 bags'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------- Pain points ---------- */}
                <section className="w-full py-16 px-margin-desktop bg-surface-container-low border-t border-outline-variant">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="font-h2 text-h2 text-on-surface text-center mb-lg">
                            {t('landing.painTitle', 'Sound familiar?')}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                            {[
                                { i: 'receipt_long', t: t('landing.pain1', 'Receipts disappear before they hit the books'), s: t('landing.pain1Sub', "Engineers stuff them in their pockets, then it rains, then it's payroll Friday.") },
                                { i: 'description', t: t('landing.pain2', 'Excel sheets fight each other across phones'), s: t('landing.pain2Sub', 'Site has v3.xlsx, office has v5.xlsx, the bank has its own number.') },
                                { i: 'forum', t: t('landing.pain3', 'Approvals take three WhatsApp messages and an angry call'), s: t('landing.pain3Sub', 'Who can approve 200,000 EGP? Nobody knows. Project stalls.') },
                                { i: 'trending_down', t: t('landing.pain4', 'Profit on cost-plus jobs is a guess'), s: t('landing.pain4Sub', "You think the margin is 10%. Sometimes it's 4%. You find out months later.") }
                            ].map((p, i) => (
                                <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col gap-sm">
                                    <Icon name={p.i} size={22} className="text-error" fill />
                                    <h3 className="font-body-md text-body-md font-semibold text-on-surface">{p.t}</h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant">{p.s}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ---------- Bento feature grid ---------- */}
                <section id="features" className="w-full py-20 px-margin-desktop bg-surface-container-lowest border-t border-outline-variant">
                    <div className="max-w-7xl mx-auto flex flex-col gap-xl">
                        <div className="text-center max-w-2xl mx-auto flex flex-col gap-sm">
                            <h2 className="font-h2 text-h2 text-on-surface">
                                {t('landing.featuresTitle', 'Built for the Site, Powerful for the Office')}
                            </h2>
                            <p className="font-body-lg text-body-lg text-on-surface-variant">
                                {t('landing.featuresSub', 'Bridges the gap between field execution and financial oversight.')}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mt-lg">
                            {/* Feature 1 — wide AI Voice */}
                            <div className="col-span-1 md:col-span-2 bg-surface-container-low rounded-xl p-xl border border-outline-variant flex flex-col justify-between hover:shadow-sm transition-shadow">
                                <div className="flex flex-col gap-md">
                                    <div className="w-12 h-12 rounded bg-primary-container flex items-center justify-center">
                                        <Icon name="mic" size={24} fill className="text-on-primary" />
                                    </div>
                                    <h3 className="font-h3 text-h3 text-on-surface">
                                        {t('landing.f1', 'AI Voice & Receipt Capture')}
                                    </h3>
                                    <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                                        {t('landing.f1Sub', 'Speak naturally or snap a photo of a receipt. Our AI extracts amounts, vendor names, and project codes — logged directly into your ledger as a draft you confirm in seconds.')}
                                    </p>
                                </div>
                                <div className="mt-lg flex flex-wrap items-center gap-sm font-label-caps text-label-caps text-on-surface-variant">
                                    <span className="bg-surface-container-high px-sm py-xs rounded">EGYPTIAN ARABIC</span>
                                    <span className="bg-surface-container-high px-sm py-xs rounded">ENGLISH</span>
                                    <span className="bg-surface-container-high px-sm py-xs rounded">RECEIPT OCR</span>
                                    <span className="bg-surface-container-high px-sm py-xs rounded">VENDOR MATCH</span>
                                </div>
                            </div>

                            {/* Feature 2 — Arabic */}
                            <div className="col-span-1 bg-surface-container-low rounded-xl p-xl border border-outline-variant flex flex-col gap-md hover:shadow-sm transition-shadow">
                                <div className="w-12 h-12 rounded bg-secondary-container flex items-center justify-center">
                                    <Icon name="translate" size={24} className="text-on-secondary-container" />
                                </div>
                                <h3 className="font-h3 text-h3 text-on-surface">
                                    {t('landing.f2', 'Full Arabic RTL Support')}
                                </h3>
                                <p className="font-body-md text-body-md text-on-surface-variant">
                                    {t('landing.f2Sub', 'A truly native experience. Right-to-left layouts and construction-specific Arabic categories.')}
                                </p>
                            </div>

                            {/* Feature 3 — Profit Engine */}
                            <div className="col-span-1 bg-surface-container-low rounded-xl p-xl border border-outline-variant flex flex-col gap-md hover:shadow-sm transition-shadow">
                                <div className="w-12 h-12 rounded bg-tertiary-container flex items-center justify-center">
                                    <Icon name="trending_up" size={24} className="text-on-tertiary-container" />
                                </div>
                                <h3 className="font-h3 text-h3 text-on-surface">
                                    {t('landing.f3', 'V1.2 Profit-on-Expense Engine')}
                                </h3>
                                <p className="font-body-md text-body-md text-on-surface-variant">
                                    {t('landing.f3Sub', 'Auto-transfers your management fee from project safe to office revenue when expenses approve. Real-time margin, not month-end surprises.')}
                                </p>
                            </div>

                            {/* Feature 4 — wide Invoicing */}
                            <div className="col-span-1 md:col-span-2 bg-surface-container-low rounded-xl p-xl border border-outline-variant flex flex-col md:flex-row gap-lg hover:shadow-sm transition-shadow items-center justify-between">
                                <div className="flex flex-col gap-md max-w-md">
                                    <div className="w-12 h-12 rounded bg-surface-tint/10 flex items-center justify-center">
                                        <Icon name="receipt_long" size={24} className="text-surface-tint" />
                                    </div>
                                    <h3 className="font-h3 text-h3 text-on-surface">
                                        {t('landing.f4', 'Egyptian-VAT Invoicing')}
                                    </h3>
                                    <p className="font-body-md text-body-md text-on-surface-variant">
                                        {t('landing.f4Sub', '14% VAT pre-filled. PDF auto-generated with your logo. Email to clients. Track partial payments to PAID.')}
                                    </p>
                                </div>
                                <div className="w-full md:w-64 h-32 bg-surface-container-lowest border border-outline-variant rounded shadow-sm flex flex-col p-sm gap-sm relative overflow-hidden">
                                    <div className="w-full h-3 bg-surface-variant rounded-sm"></div>
                                    <div className="w-3/4 h-3 bg-surface-variant rounded-sm"></div>
                                    <div className="w-1/2 h-3 bg-surface-variant rounded-sm"></div>
                                    <div className="mt-auto flex justify-between items-end">
                                        <div className="w-16 h-6 bg-surface-variant rounded-sm"></div>
                                        <div className="w-24 h-8 bg-primary/20 rounded-sm flex items-center justify-center text-primary font-label-caps text-label-caps">
                                            INV-2026-001
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Feature 5 — DSR */}
                            <div className="col-span-1 bg-surface-container-low rounded-xl p-xl border border-outline-variant flex flex-col gap-md hover:shadow-sm transition-shadow">
                                <div className="w-12 h-12 rounded bg-primary-container flex items-center justify-center">
                                    <Icon name="assignment" size={24} fill className="text-on-primary" />
                                </div>
                                <h3 className="font-h3 text-h3 text-on-surface">
                                    {t('landing.f5', 'Daily Site Reports (mobile)')}
                                </h3>
                                <p className="font-body-md text-body-md text-on-surface-variant">
                                    {t('landing.f5Sub', 'Engineers log weather, attendance, materials received, and GPS-tagged photos. Managers acknowledge from the office.')}
                                </p>
                            </div>

                            {/* Feature 6 — Bank Reconciliation */}
                            <div className="col-span-1 bg-surface-container-low rounded-xl p-xl border border-outline-variant flex flex-col gap-md hover:shadow-sm transition-shadow">
                                <div className="w-12 h-12 rounded bg-secondary-container flex items-center justify-center">
                                    <Icon name="account_balance" size={24} className="text-on-secondary-container" />
                                </div>
                                <h3 className="font-h3 text-h3 text-on-surface">
                                    {t('landing.f6', 'Bank Reconciliation')}
                                </h3>
                                <p className="font-body-md text-body-md text-on-surface-variant">
                                    {t('landing.f6Sub', 'Upload your NBE / CIB / QNB statement CSV. AI matches each row to your transactions — you confirm.')}
                                </p>
                            </div>

                            {/* Feature 7 — RBAC */}
                            <div className="col-span-1 bg-surface-container-low rounded-xl p-xl border border-outline-variant flex flex-col gap-md hover:shadow-sm transition-shadow">
                                <div className="w-12 h-12 rounded bg-tertiary-container flex items-center justify-center">
                                    <Icon name="shield_person" size={24} className="text-on-tertiary-container" />
                                </div>
                                <h3 className="font-h3 text-h3 text-on-surface">
                                    {t('landing.f7', 'Multi-tier Approvals')}
                                </h3>
                                <p className="font-body-md text-body-md text-on-surface-variant">
                                    {t('landing.f7Sub', 'Engineer up to 5,000 EGP, manager up to 50,000, admin above. Configure tiers per company.')}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------- Mobility ---------- */}
                <section className="w-full py-20 px-margin-desktop" style={{ background: 'linear-gradient(135deg, #003ea8 0%, #2563eb 100%)' }}>
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-xl items-center text-on-primary">
                        <div className="flex flex-col gap-md">
                            <Icon name="phone_android" size={32} fill className="opacity-90" />
                            <h2 className="font-h2 text-on-primary" style={{ fontSize: '36px', lineHeight: 1.2, fontWeight: 800 }}>
                                {t('landing.mobileTitle', 'On the site, in the office, on the go.')}
                            </h2>
                            <p className="font-body-lg text-body-lg opacity-90">
                                {t('landing.mobileSub', 'Engineers capture from their phones. Managers review from the office. Same data, no Excel exchange. Native Android + iOS apps via Expo.')}
                            </p>
                            <div className="flex gap-md flex-wrap mt-sm">
                                <div className="bg-white/10 border border-white/30 rounded px-md py-sm flex items-center gap-md">
                                    <Icon name="android" size={28} fill />
                                    <div>
                                        <div className="font-label-caps text-label-caps opacity-80">GET IT ON</div>
                                        <div className="font-body-md text-body-md font-bold">Google Play</div>
                                    </div>
                                </div>
                                <div className="bg-white/10 border border-white/30 rounded px-md py-sm flex items-center gap-md">
                                    <Icon name="apple" size={28} fill />
                                    <div>
                                        <div className="font-label-caps text-label-caps opacity-80">{t('landing.downloadOn', 'DOWNLOAD ON THE')}</div>
                                        <div className="font-body-md text-body-md font-bold">App Store</div>
                                    </div>
                                </div>
                            </div>
                            <div className="font-label-caps text-label-caps opacity-80 mt-sm">
                                {t('landing.appsComing', 'Stores coming soon — beta available via Expo Go today')}
                            </div>
                        </div>

                        {/* CSS-only phone mockup */}
                        <div className="flex justify-center">
                            <div
                                className="rounded-[36px] p-md shadow-2xl"
                                style={{
                                    width: 280,
                                    height: 540,
                                    border: '8px solid #1f2937',
                                    background: '#f9fafb'
                                }}
                            >
                                <div className="bg-surface-container-lowest rounded-[24px] h-full p-md flex flex-col text-on-surface">
                                    <div className="font-body-md text-body-md font-bold mb-sm">AI Drafts</div>
                                    <div className="grid grid-cols-2 gap-xs mb-md">
                                        <div className="bg-primary text-on-primary rounded p-sm text-center font-body-sm text-body-sm font-semibold">🎤 Voice</div>
                                        <div className="bg-primary text-on-primary rounded p-sm text-center font-body-sm text-body-sm font-semibold">📷 Camera</div>
                                    </div>
                                    {[
                                        { name: 'شركة القاهرة للأسمنت', amt: '٢٥٬٠٠٠ ج.م.', tag: 'Pending', tagBg: 'bg-yellow-100', tagFg: 'text-yellow-800' },
                                        { name: 'مصنعية بناء — مبنى A', amt: '٨٬٥٠٠ ج.م.', tag: 'Pending', tagBg: 'bg-yellow-100', tagFg: 'text-yellow-800' },
                                        { name: 'Steel rebar 12mm', amt: 'EGP 12,400', tag: 'Committed', tagBg: 'bg-green-100', tagFg: 'text-green-800' }
                                    ].map((it, i) => (
                                        <div key={i} className="bg-surface-container-low p-sm rounded mb-xs">
                                            <div className="font-body-sm text-body-sm font-semibold mb-xs">{it.name}</div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-label-caps text-label-caps text-on-surface-variant">{it.amt}</span>
                                                <span className={`font-label-caps text-label-caps px-xs py-[2px] rounded ${it.tagBg} ${it.tagFg}`}>{it.tag}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------- Pricing ---------- */}
                <section id="pricing" className="w-full py-20 px-margin-desktop bg-surface-container-lowest border-t border-outline-variant">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto flex flex-col gap-sm mb-lg">
                            <h2 className="font-h2 text-h2 text-on-surface">
                                {t('landing.pricingTitle', 'Simple, fair pricing')}
                            </h2>
                            <p className="font-body-lg text-body-lg text-on-surface-variant">
                                {t('landing.pricingSub', 'Start free, forever. Upgrade when your team and projects grow.')}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                            {plans.length === 0 ? (
                                <div className="md:col-span-3 text-center font-body-md text-body-md text-on-surface-variant py-xl">
                                    {t('landing.pricingLoading', 'Loading pricing…')}
                                </div>
                            ) : plans.map(plan => {
                                const isPopular = plan.key === 'BASIC';
                                return (
                                    <div
                                        key={plan.key}
                                        className={`relative bg-surface-container-low rounded-xl p-xl border flex flex-col gap-md transition-shadow hover:shadow-sm ${isPopular ? 'border-primary border-2' : 'border-outline-variant'}`}
                                    >
                                        {isPopular && (
                                            <span className="absolute -top-md right-lg bg-primary text-on-primary font-label-caps text-label-caps px-md py-xs rounded-full">
                                                {t('landing.popular', 'MOST POPULAR')}
                                            </span>
                                        )}
                                        <h3 className="font-h3 text-h3 text-on-surface">{plan.name}</h3>
                                        <div>
                                            <span className="font-h1 text-h1 text-on-surface">
                                                {plan.priceEgp > 0 ? currency(plan.priceEgp) : t('landing.free', 'Free')}
                                            </span>
                                            {plan.priceEgp > 0 && (
                                                <span className="font-body-sm text-body-sm text-on-surface-variant ms-xs">
                                                    / {t('billing.month', 'month')}
                                                </span>
                                            )}
                                        </div>
                                        <ul className="flex flex-col gap-sm mt-sm">
                                            {plan.features.map((f, i) => (
                                                <li key={i} className="flex items-start gap-sm font-body-md text-body-md text-on-surface-variant">
                                                    <Icon name="check_circle" size={16} fill className="text-primary mt-[2px] flex-shrink-0" />
                                                    <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link
                                            to={user ? '/billing' : '/signup'}
                                            className={`mt-md block text-center px-lg py-md rounded font-body-md text-body-md font-semibold transition-opacity ${isPopular ? 'bg-primary text-on-primary hover:opacity-90' : 'bg-surface-container-lowest text-primary border border-outline-variant hover:bg-surface-variant'}`}
                                        >
                                            {plan.priceEgp === 0
                                                ? t('landing.startFree', 'Start free')
                                                : (user ? t('landing.upgradeNow', 'Upgrade now') : t('landing.choosePlan', 'Choose this plan'))}
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-center mt-lg font-body-sm text-body-sm text-on-surface-variant">
                            {t('landing.paymobNote', 'Cards, mobile wallets (Vodafone Cash, etc.), and Fawry — powered by Paymob.')}
                        </p>
                    </div>
                </section>

                {/* ---------- Final CTA ---------- */}
                <section className="w-full py-16 px-margin-desktop bg-inverse-surface text-inverse-on-surface text-center">
                    <div className="max-w-3xl mx-auto flex flex-col gap-md items-center">
                        <h2 className="font-h2 text-h2" style={{ fontSize: '36px', fontWeight: 800 }}>
                            {t('landing.ctaTitle', 'Get your first project on board this week.')}
                        </h2>
                        <p className="font-body-lg text-body-lg opacity-85">
                            {t('landing.ctaSub', 'Sign up takes 60 seconds. Free forever for 1 project. No credit card.')}
                        </p>
                        <Link
                            to={ctaTo}
                            className="bg-primary text-on-primary px-xl py-md rounded font-body-md text-body-md hover:opacity-90 transition-opacity flex items-center gap-sm shadow-sm mt-sm"
                        >
                            {ctaLabel}
                            <Icon name="arrow_forward" size={18} />
                        </Link>
                    </div>
                </section>
            </main>

            {/* ---------- Footer ---------- */}
            <footer className="bg-surface-container-lowest border-t border-outline-variant py-lg px-margin-desktop text-center text-on-surface-variant font-body-sm text-body-sm">
                © {new Date().getFullYear()} Engineers Management.{' '}
                <a
                    href="https://github.com/8ofry/Engineers-Management"
                    className="text-primary hover:underline"
                >
                    GitHub
                </a>
            </footer>
        </div>
    );
}
