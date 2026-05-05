import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Building2, Mic, Camera, Sparkles, Smartphone, Banknote,
    ClipboardList, Receipt, Users, ShieldCheck, Languages,
    Check, ArrowRight, AlertTriangle, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { billingAPI } from '../services/api';
import { useFormat } from '../utils/format';

// Public landing page at /. Sections: hero → pain points → features →
// mobility → pricing (live from /api/billing/plans) → CTA. Sign in /
// sign up buttons send to existing /login + /signup routes.

export default function Landing() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { currency } = useFormat();
    const [plans, setPlans] = useState([]);
    const isRTL = i18n.language === 'ar';

    useEffect(() => {
        billingAPI.listPlans()
            .then(r => setPlans(r.data.data || []))
            .catch(() => { /* ok if backend down — page still renders */ });
    }, []);

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en');
    };

    const primaryCta = user
        ? { label: t('landing.openApp', 'Open App'), to: '/dashboard' }
        : { label: t('landing.startFree', 'Start free'), to: '/signup' };

    return (
        <div style={{ minHeight: '100vh', background: 'white', color: '#111827' }}>
            {/* Top bar */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 10,
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid #e5e7eb',
                padding: '12px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18 }}>
                    <Building2 size={24} color="#2563eb" />
                    <span>Engineers Management</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={toggleLanguage}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'transparent', border: '1px solid #e5e7eb',
                            padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                            fontSize: 13, fontWeight: 600
                        }}
                    >
                        <Languages size={14} />
                        {i18n.language === 'en' ? 'AR' : 'EN'}
                    </button>
                    {user ? (
                        <Link to="/dashboard" style={btnStyle('primary')}>
                            {t('landing.openApp', 'Open App')}
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" style={btnStyle('ghost')}>
                                {t('landing.signIn', 'Sign in')}
                            </Link>
                            <Link to="/signup" style={btnStyle('primary')}>
                                {t('landing.startFree', 'Start free')}
                            </Link>
                        </>
                    )}
                </div>
            </header>

            {/* Hero */}
            <section style={{ padding: '80px 24px 60px', textAlign: 'center', maxWidth: 1100, margin: '0 auto' }}>
                <div style={{
                    display: 'inline-block',
                    background: '#dbeafe', color: '#1e40af',
                    padding: '6px 14px', borderRadius: 999,
                    fontSize: 13, fontWeight: 600, marginBottom: 20
                }}>
                    {t('landing.tagline', 'Built for Egyptian construction firms')}
                </div>
                <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
                    {t('landing.heroTitle', 'Stop running your sites on Excel.')}<br />
                    <span style={{ color: '#2563eb' }}>
                        {t('landing.heroAccent', 'Capture, approve, and bill in seconds.')}
                    </span>
                </h1>
                <p style={{ fontSize: 18, color: '#4b5563', maxWidth: 720, margin: '0 auto 32px', lineHeight: 1.6 }}>
                    {t('landing.heroSub', 'A bilingual ERP that understands construction in Egypt — with voice + receipt-photo capture, multi-tier approvals, the V1.2 Profit-on-Expense engine, mobile DSRs, and Egyptian VAT-ready invoicing.')}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to={primaryCta.to} style={{ ...btnStyle('primary'), padding: '14px 28px', fontSize: 16 }}>
                        {primaryCta.label}
                        <ArrowRight size={18} style={{ marginInlineStart: 6, verticalAlign: 'middle' }} />
                    </Link>
                    <a href="#features" style={{ ...btnStyle('ghost'), padding: '14px 28px', fontSize: 16 }}>
                        {t('landing.seeFeatures', 'See what it does')}
                    </a>
                </div>
                <div style={{ marginTop: 24, color: '#6b7280', fontSize: 14 }}>
                    {t('landing.freemiumNote', 'Free forever for 1 project · No credit card required · Arabic + English')}
                </div>
            </section>

            {/* Pain points */}
            <section style={{ background: '#f9fafb', padding: '60px 24px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <h2 style={sectionTitle}>{t('landing.painTitle', 'Sound familiar?')}</h2>
                    <div className="grid" style={{
                        display: 'grid', gap: 16,
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        marginTop: 32
                    }}>
                        {[
                            { t: t('landing.pain1', 'Receipts disappear before they hit the books'), s: t('landing.pain1Sub', 'Engineers stuff them in their pockets, then it rains, then it\'s payroll Friday.') },
                            { t: t('landing.pain2', 'Excel sheets fight each other across phones'), s: t('landing.pain2Sub', 'The site has v3.xlsx, the office has v5.xlsx, the bank has its own number.') },
                            { t: t('landing.pain3', 'Approvals take three WhatsApp messages and an angry call'), s: t('landing.pain3Sub', 'Who can approve 200,000 EGP? Nobody knows. Project stalls.') },
                            { t: t('landing.pain4', 'Profit on cost-plus jobs is a guess'), s: t('landing.pain4Sub', 'You think the margin is 10%. Sometimes it\'s 4%. Sometimes you don\'t find out for months.') }
                        ].map((p, i) => (
                            <div key={i} style={painCardStyle}>
                                <AlertTriangle size={20} color="#f59e0b" style={{ marginBottom: 8 }} />
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{p.t}</h3>
                                <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{p.s}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" style={{ padding: '80px 24px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <h2 style={sectionTitle}>{t('landing.featuresTitle', 'What you get')}</h2>
                    <p style={sectionSub}>{t('landing.featuresSub', 'Built for the way Egyptian sites actually run.')}</p>
                    <div style={{
                        display: 'grid', gap: 20,
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        marginTop: 40
                    }}>
                        <FeatureCard
                            icon={<Mic size={22} />}
                            title={t('landing.f1', 'Voice → draft transaction')}
                            desc={t('landing.f1Sub', 'Speak in Arabic ("اشترينا 50 شيكارة أسمنت بـ 25 ألف"). AI parses it, matches the vendor + project, hands you a draft to confirm.')}
                            color="#2563eb"
                        />
                        <FeatureCard
                            icon={<Camera size={22} />}
                            title={t('landing.f2', 'Receipt photo → draft transaction')}
                            desc={t('landing.f2Sub', 'Snap a receipt or supplier invoice. AI reads vendor, total, line items. Engineer reviews + saves in 5 seconds.')}
                            color="#10b981"
                        />
                        <FeatureCard
                            icon={<Sparkles size={22} />}
                            title={t('landing.f3', 'V1.2 Profit-on-Expense engine')}
                            desc={t('landing.f3Sub', 'Auto-transfers your management fee from project safe to office revenue when expenses approve — accurate margin in real time, not at month-end.')}
                            color="#8b5cf6"
                        />
                        <FeatureCard
                            icon={<ClipboardList size={22} />}
                            title={t('landing.f4', 'Mobile Daily Site Reports')}
                            desc={t('landing.f4Sub', 'Engineers log weather, attendance, materials received, issues, GPS-tagged photos — manager acknowledges from the office.')}
                            color="#f59e0b"
                        />
                        <FeatureCard
                            icon={<Receipt size={22} />}
                            title={t('landing.f5', 'Egyptian-VAT invoicing')}
                            desc={t('landing.f5Sub', '14% VAT pre-filled. PDF auto-generated with your logo. Email to client. Track partial payments.')}
                            color="#ec4899"
                        />
                        <FeatureCard
                            icon={<Banknote size={22} />}
                            title={t('landing.f6', 'Bank reconciliation')}
                            desc={t('landing.f6Sub', 'Upload your NBE / CIB / QNB statement CSV. AI matches each row to your transactions. You confirm.')}
                            color="#0ea5e9"
                        />
                        <FeatureCard
                            icon={<ShieldCheck size={22} />}
                            title={t('landing.f7', 'Multi-tier approvals')}
                            desc={t('landing.f7Sub', 'Engineer approves up to 5,000 EGP, manager up to 50,000, admin above that. Configure tiers per company.')}
                            color="#dc2626"
                        />
                        <FeatureCard
                            icon={<Users size={22} />}
                            title={t('landing.f8', 'Multi-tenant + RBAC')}
                            desc={t('landing.f8Sub', 'Admins, managers, engineers, accountants — each sees what they need. SUPER_ADMIN scopes for franchises.')}
                            color="#0f766e"
                        />
                    </div>
                </div>
            </section>

            {/* Mobility */}
            <section style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                color: 'white', padding: '80px 24px'
            }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
                    <div>
                        <Smartphone size={32} style={{ marginBottom: 12 }} />
                        <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>
                            {t('landing.mobileTitle', 'On the site, in the office, on the go.')}
                        </h2>
                        <p style={{ fontSize: 17, opacity: 0.9, lineHeight: 1.6, marginBottom: 24 }}>
                            {t('landing.mobileSub', 'Engineers capture from their phones. Managers review from the office. Same data, no Excel exchange. Native Android + iOS apps via Expo.')}
                        </p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <BadgeStub icon="🤖" topLine={t('landing.getOn', 'GET IT ON')} botLine="Google Play" />
                            <BadgeStub icon="" topLine={t('landing.downloadOn', 'Download on the')} botLine="App Store" />
                        </div>
                        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.8 }}>
                            {t('landing.appsComing', 'Stores coming soon — beta available via Expo Go today')}
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            width: 280, height: 540,
                            border: '8px solid #1f2937',
                            borderRadius: 36,
                            background: '#f9fafb',
                            padding: 14,
                            boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
                            display: 'flex', flexDirection: 'column'
                        }}>
                            <div style={{ flex: 1, background: 'white', borderRadius: 24, padding: 20, color: '#111827' }}>
                                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>AI Drafts</div>
                                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                                    <div style={{ flex: 1, background: '#2563eb', color: 'white', padding: 12, borderRadius: 8, fontSize: 12, textAlign: 'center', fontWeight: 600 }}>🎤 Voice</div>
                                    <div style={{ flex: 1, background: '#2563eb', color: 'white', padding: 12, borderRadius: 8, fontSize: 12, textAlign: 'center', fontWeight: 600 }}>📷 Camera</div>
                                </div>
                                {[
                                    { name: 'شركة القاهرة للأسمنت', amt: '25,000 EGP', tag: 'Pending' },
                                    { name: 'مصنعية بناء — مبنى A', amt: '8,500 EGP', tag: 'Pending' },
                                    { name: 'Steel rebar 12mm', amt: '12,400 EGP', tag: 'Committed' }
                                ].map((it, i) => (
                                    <div key={i} style={{ background: '#f9fafb', padding: 10, borderRadius: 6, marginBottom: 6, fontSize: 12 }}>
                                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{it.name}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                                            <span>{it.amt}</span>
                                            <span style={{
                                                background: it.tag === 'Committed' ? '#d1fae5' : '#fef3c7',
                                                color: it.tag === 'Committed' ? '#065f46' : '#92400e',
                                                padding: '2px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600
                                            }}>{it.tag}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" style={{ padding: '80px 24px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <h2 style={sectionTitle}>{t('landing.pricingTitle', 'Simple, fair pricing')}</h2>
                    <p style={sectionSub}>
                        {t('landing.pricingSub', 'Start free, forever. Upgrade when your team and projects grow.')}
                    </p>
                    <div style={{
                        display: 'grid', gap: 16,
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        marginTop: 40, alignItems: 'stretch'
                    }}>
                        {plans.length === 0 ? (
                            // Static fallback if /api/billing/plans is unreachable
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280' }}>
                                {t('landing.pricingLoading', 'Loading pricing…')}
                            </div>
                        ) : plans.map(plan => (
                            <div key={plan.key} style={{
                                ...painCardStyle,
                                padding: 24,
                                borderColor: plan.key === 'BASIC' ? '#2563eb' : '#e5e7eb',
                                borderWidth: plan.key === 'BASIC' ? 2 : 1,
                                position: 'relative'
                            }}>
                                {plan.key === 'BASIC' && (
                                    <div style={{
                                        position: 'absolute', top: -10, insetInlineEnd: 16,
                                        background: '#2563eb', color: 'white',
                                        padding: '2px 12px', borderRadius: 12,
                                        fontSize: 11, fontWeight: 700
                                    }}>
                                        {t('landing.popular', 'MOST POPULAR')}
                                    </div>
                                )}
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 4 }}>
                                    {plan.name}
                                </h3>
                                <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
                                    {plan.priceEgp > 0 ? currency(plan.priceEgp) : t('landing.free', 'Free')}
                                </div>
                                {plan.priceEgp > 0 && (
                                    <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
                                        / {t('billing.month', 'month')}
                                    </div>
                                )}
                                <ul style={{ paddingInlineStart: 0, listStyle: 'none', marginTop: 16 }}>
                                    {plan.features.map((f, i) => (
                                        <li key={i} style={{ fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                            <Check size={14} color="#10b981" style={{ flexShrink: 0, marginTop: 4 }} />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div style={{ marginTop: 20 }}>
                                    <Link
                                        to={user ? '/billing' : '/signup'}
                                        style={{
                                            ...btnStyle(plan.key === 'BASIC' ? 'primary' : 'ghost'),
                                            display: 'block', textAlign: 'center', width: '100%'
                                        }}
                                    >
                                        {plan.priceEgp === 0
                                            ? t('landing.startFree', 'Start free')
                                            : (user ? t('landing.upgradeNow', 'Upgrade now') : t('landing.choosePlan', 'Choose this plan'))}
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p style={{ textAlign: 'center', marginTop: 24, color: '#6b7280', fontSize: 14 }}>
                        {t('landing.paymobNote', 'Cards, mobile wallets (Vodafone Cash, etc.), and Fawry — powered by Paymob.')}
                    </p>
                </div>
            </section>

            {/* Final CTA */}
            <section style={{ background: '#111827', color: 'white', padding: '60px 24px', textAlign: 'center' }}>
                <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
                    {t('landing.ctaTitle', 'Get your first project on board this week.')}
                </h2>
                <p style={{ fontSize: 16, opacity: 0.85, marginBottom: 24, maxWidth: 600, margin: '0 auto 24px' }}>
                    {t('landing.ctaSub', 'Sign up takes 60 seconds. Free forever for 1 project. No credit card.')}
                </p>
                <Link to={primaryCta.to} style={{ ...btnStyle('primary'), padding: '14px 32px', fontSize: 16 }}>
                    {primaryCta.label} <ArrowRight size={18} style={{ marginInlineStart: 6, verticalAlign: 'middle' }} />
                </Link>
            </section>

            {/* Footer */}
            <footer style={{
                padding: '24px', textAlign: 'center',
                color: '#6b7280', fontSize: 13, borderTop: '1px solid #e5e7eb'
            }}>
                © {new Date().getFullYear()} Engineers Management.
                {' '}
                <a href="https://github.com/8ofry/Engineers-Management" style={{ color: '#2563eb', textDecoration: 'none' }}>
                    GitHub
                </a>
            </footer>
        </div>
    );
}

// ---------- helpers ----------
const btnStyle = (variant) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    textDecoration: 'none',
    cursor: 'pointer',
    border: '1px solid transparent',
    ...(variant === 'primary' && {
        background: '#2563eb', color: 'white'
    }),
    ...(variant === 'ghost' && {
        background: 'transparent', color: '#111827',
        borderColor: '#e5e7eb'
    })
});

const sectionTitle = {
    fontSize: 'clamp(28px, 4vw, 40px)',
    fontWeight: 800,
    textAlign: 'center',
    marginBottom: 8
};

const sectionSub = {
    color: '#6b7280',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 24
};

const painCardStyle = {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20
};

const FeatureCard = ({ icon, title, desc, color }) => (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: `${color}15`, color: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14
        }}>
            {icon}
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#4b5563', margin: 0, lineHeight: 1.55 }}>{desc}</p>
    </div>
);

const BadgeStub = ({ icon, topLine, botLine }) => (
    <div style={{
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.3)',
        padding: '8px 16px', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'not-allowed'
    }}>
        <span style={{ fontSize: 22 }}>{icon || '🍎'}</span>
        <div>
            <div style={{ fontSize: 10, opacity: 0.8 }}>{topLine}</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{botLine}</div>
        </div>
    </div>
);
