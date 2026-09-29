import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Globe, Shield, FileText } from 'lucide-react';
import SkyToggle from '../components/ui/sky-toggle';
import { BeamsBackground } from '@/components/ui/beams-background';
import './Legal.css';

export default function PrivacyPolicy() {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme_preset_v3');
        if (!saved) return 'light';
        return saved === 'dark' ? 'dark' : 'light';
    });
    const light = theme === 'light';

    useEffect(() => {
        document.body.classList.toggle('light-mode', light);
        localStorage.setItem('theme_preset', theme);
        localStorage.setItem('theme_preset_v3', theme);
    }, [theme, light]);

    const toggleLanguage = () => {
        const nextLang = isAr ? 'en' : 'ar';
        i18n.changeLanguage(nextLang);
        document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = nextLang;
        localStorage.setItem('language', nextLang);
    };

    const T = (en, ar) => (isAr ? ar : en);
    const lastUpdated = T('September 29, 2026', '\u0662\u0669 \u0633\u0628\u062a\u0645\u0628\u0631 \u0662\u0660\u0662\u0666');

    return (
        <div className="legal-container" dir={isAr ? 'rtl' : 'ltr'}>
            {!light && <BeamsBackground className="legal-beams" intensity="subtle" />}
            <div className="legal-background" />

            <div className="legal-topbar">
                <Link to="/" className="legal-back-btn">
                    {isAr ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                    <span>{T('Back to Home', '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0631\u0626\u064a\u0633\u064a\u0629')}</span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="legal-lang-btn" onClick={toggleLanguage}>
                        <Globe size={14} />
                        <span>{isAr ? 'EN' : '\u0639\u0631\u0628\u064a'}</span>
                    </button>
                    <SkyToggle checked={!light} onChange={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} size={18} />
                </div>
            </div>

            <div className="legal-content">
                <div className="legal-card">
                    <div className="legal-header">
                        <div className="legal-icon-wrap"><Shield size={24} /></div>
                        <h1>{T('Privacy Policy', '\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629')}</h1>
                        <p className="legal-updated">{T('Last updated', '\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b')}: {lastUpdated}</p>
                    </div>

                    <div className="legal-body">
                        <section className="legal-section">
                            <h2>{T('1. Information We Collect', '\u0661. \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062a\u064a \u0646\u062c\u0645\u0639\u0647\u0627')}</h2>
                            <p>{T('We collect the following types of information:', '\u0646\u062c\u0645\u0639 \u0627\u0644\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062a\u0627\u0644\u064a\u0629 \u0645\u0646 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a:')}</p>
                            <ul>
                                <li>{T('Account information: name, email, phone number, company name', '\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628: \u0627\u0644\u0627\u0633\u0645\u060c \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u060c \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641\u060c \u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629')}</li>
                                <li>{T('Financial data: invoices, expenses, safe balances, project costs you enter', '\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629: \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631\u060c \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a\u060c \u0623\u0631\u0635\u062f\u0629 \u0627\u0644\u062e\u0632\u0627\u0626\u0646\u060c \u062a\u0643\u0627\u0644\u064a\u0641 \u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639')}</li>
                                <li>{T('Documents: uploaded invoices, photos, PDFs processed by our AI engine', '\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a: \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0627\u0644\u0645\u0631\u0641\u0648\u0639\u0629\u060c \u0627\u0644\u0635\u0648\u0631\u060c \u0645\u0644\u0641\u0627\u062a PDF \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a')}</li>
                                <li>{T('Usage data: login timestamps, feature usage, device info, IP address', '\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645: \u0623\u0648\u0642\u0627\u062a \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644\u060c \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0645\u064a\u0632\u0627\u062a\u060c \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062c\u0647\u0627\u0632')}</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h2>{T('2. How We Use Your Information', '\u0662. \u0643\u064a\u0641 \u0646\u0633\u062a\u062e\u062f\u0645 \u0645\u0639\u0644\u0648\u0645\u0627\u062a\u0643')}</h2>
                            <ul>
                                <li>{T('To provide, maintain, and improve the Platform', '\u0644\u062a\u0642\u062f\u064a\u0645 \u0648\u0635\u064a\u0627\u0646\u0629 \u0648\u062a\u062d\u0633\u064a\u0646 \u0627\u0644\u0645\u0646\u0635\u0629')}</li>
                                <li>{T('To process your financial transactions and generate reports', '\u0644\u0645\u0639\u0627\u0644\u062c\u0629 \u0645\u0639\u0627\u0645\u0644\u0627\u062a\u0643 \u0627\u0644\u0645\u0627\u0644\u064a\u0629 \u0648\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631')}</li>
                                <li>{T('To power AI features (OCR, smart categorization, assistant)', '\u0644\u062a\u0634\u063a\u064a\u0644 \u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a')}</li>
                                <li>{T('To send billing confirmations, security alerts, and service updates', '\u0644\u0625\u0631\u0633\u0627\u0644 \u062a\u0623\u0643\u064a\u062f\u0627\u062a \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0648\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0627\u0644\u0623\u0645\u0627\u0646')}</li>
                                <li>{T('To comply with legal obligations', '\u0644\u0644\u0627\u0645\u062a\u062b\u0627\u0644 \u0644\u0644\u0627\u0644\u062a\u0632\u0627\u0645\u0627\u062a \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629')}</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h2>{T('3. Data Storage & Security', '\u0663. \u062a\u062e\u0632\u064a\u0646 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0648\u0627\u0644\u0623\u0645\u0627\u0646')}</h2>
                            <p>{T(
                                'Your data is stored on secure, encrypted cloud servers. We implement industry-standard security measures including: encryption at rest and in transit (TLS 1.3), two-factor authentication (2FA), role-based access controls, regular security audits, and automated backups.',
                                '\u064a\u062a\u0645 \u062a\u062e\u0632\u064a\u0646 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0639\u0644\u0649 \u062e\u0648\u0627\u062f\u0645 \u0633\u062d\u0627\u0628\u064a\u0629 \u0622\u0645\u0646\u0629 \u0648\u0645\u0634\u0641\u0631\u0629. \u0646\u0637\u0628\u0642 \u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0623\u0645\u0627\u0646 \u0645\u0639\u064a\u0627\u0631\u064a\u0629 \u062a\u0634\u0645\u0644 \u0627\u0644\u062a\u0634\u0641\u064a\u0631 \u0648\u0627\u0644\u0645\u0635\u0627\u062f\u0642\u0629 \u0627\u0644\u062b\u0646\u0627\u0626\u064a\u0629 \u0648\u0627\u0644\u0646\u0633\u062e \u0627\u0644\u0627\u062d\u062a\u064a\u0627\u0637\u064a.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('4. Data Sharing', '\u0664. \u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a')}</h2>
                            <p>{T(
                                'We do not sell your personal data. We may share data only with: (a) service providers who assist us in operating the Platform (cloud hosting, payment processing); (b) law enforcement when required by law; (c) your authorized team members within your workspace.',
                                '\u0644\u0627 \u0646\u0628\u064a\u0639 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0627\u0644\u0634\u062e\u0635\u064a\u0629. \u0642\u062f \u0646\u0634\u0627\u0631\u0643 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0641\u0642\u0637 \u0645\u0639: (\u0623) \u0645\u0632\u0648\u062f\u064a \u0627\u0644\u062e\u062f\u0645\u0627\u062a\u061b (\u0628) \u062c\u0647\u0627\u062a \u0625\u0646\u0641\u0627\u0630 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u061b (\u062c) \u0623\u0639\u0636\u0627\u0621 \u0641\u0631\u064a\u0642\u0643 \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u064a\u0646.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('5. AI Data Processing', '\u0665. \u0645\u0639\u0627\u0644\u062c\u0629 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a')}</h2>
                            <p>{T(
                                'When you use AI features, your documents may be processed by third-party AI services (e.g., Google Cloud Vision, OpenAI) to extract text and categorize data. These services are bound by strict data processing agreements. We do not use your financial data to train AI models.',
                                '\u0639\u0646\u062f \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a\u060c \u0642\u062f \u064a\u062a\u0645 \u0645\u0639\u0627\u0644\u062c\u0629 \u0645\u0633\u062a\u0646\u062f\u0627\u062a\u0643 \u0628\u0648\u0627\u0633\u0637\u0629 \u062e\u062f\u0645\u0627\u062a \u0637\u0631\u0641 \u062b\u0627\u0644\u062b. \u0644\u0627 \u0646\u0633\u062a\u062e\u062f\u0645 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0627\u0644\u0645\u0627\u0644\u064a\u0629 \u0644\u062a\u062f\u0631\u064a\u0628 \u0646\u0645\u0627\u0630\u062c \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('6. Your Rights', '\u0666. \u062d\u0642\u0648\u0642\u0643')}</h2>
                            <p>{T('You have the right to:', '\u0644\u062f\u064a\u0643 \u0627\u0644\u062d\u0642 \u0641\u064a:')}</p>
                            <ul>
                                <li>{T('Access your personal data', '\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0627\u0644\u0634\u062e\u0635\u064a\u0629')}</li>
                                <li>{T('Request correction of inaccurate data', '\u0637\u0644\u0628 \u062a\u0635\u062d\u064a\u062d \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u063a\u064a\u0631 \u0627\u0644\u062f\u0642\u064a\u0642\u0629')}</li>
                                <li>{T('Request deletion of your account and data', '\u0637\u0644\u0628 \u062d\u0630\u0641 \u062d\u0633\u0627\u0628\u0643 \u0648\u0628\u064a\u0627\u0646\u0627\u062a\u0643')}</li>
                                <li>{T('Export your data in standard formats', '\u062a\u0635\u062f\u064a\u0631 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0628\u0635\u064a\u063a \u0642\u064a\u0627\u0633\u064a\u0629')}</li>
                                <li>{T('Withdraw consent for optional data processing', '\u0633\u062d\u0628 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0627\u062e\u062a\u064a\u0627\u0631\u064a\u0629')}</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h2>{T('7. Cookies', '\u0667. \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637')}</h2>
                            <p>{T(
                                'Hesaby uses essential cookies for authentication and session management. We also use localStorage for theme preferences and language settings. We do not use third-party tracking or advertising cookies.',
                                '\u064a\u0633\u062a\u062e\u062f\u0645 \u062d\u0633\u0627\u0628\u064a \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629 \u0644\u0644\u0645\u0635\u0627\u062f\u0642\u0629 \u0648\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062c\u0644\u0633\u0627\u062a. \u0644\u0627 \u0646\u0633\u062a\u062e\u062f\u0645 \u0645\u0644\u0641\u0627\u062a \u062a\u062a\u0628\u0639 \u0623\u0648 \u0625\u0639\u0644\u0627\u0646\u0627\u062a.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('8. Data Retention', '\u0668. \u0627\u0644\u0627\u062d\u062a\u0641\u0627\u0638 \u0628\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a')}</h2>
                            <p>{T(
                                'We retain your data for as long as your account is active. Upon account deletion, we will permanently remove your data within 30 days, except where retention is required by law (e.g., financial records as per Egyptian tax regulations).',
                                '\u0646\u062d\u062a\u0641\u0638 \u0628\u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0637\u0627\u0644\u0645\u0627 \u062d\u0633\u0627\u0628\u0643 \u0646\u0634\u0637. \u0639\u0646\u062f \u062d\u0630\u0641 \u0627\u0644\u062d\u0633\u0627\u0628\u060c \u0633\u0646\u062d\u0630\u0641 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u062e\u0644\u0627\u0644 \u0663\u0660 \u064a\u0648\u0645\u064b\u0627.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('9. Contact', '\u0669. \u0627\u0644\u062a\u0648\u0627\u0635\u0644')}</h2>
                            <p>{T('For privacy inquiries, contact us at:', '\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631\u0627\u062a \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629\u060c \u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627:')}</p>
                            <p className="legal-contact"><FileText size={14} /><a href="mailto:hesabyaisupport@gmail.com">hesabyaisupport@gmail.com</a></p>
                        </section>
                    </div>

                    <div className="legal-bottom-links">
                        <Link to="/terms">{T('Terms of Service', '\u0634\u0631\u0648\u0637 \u0627\u0644\u062e\u062f\u0645\u0629')}</Link>
                        <span className="legal-dot">·</span>
                        <Link to="/">{T('Back to Home', '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0631\u0626\u064a\u0633\u064a\u0629')}</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
