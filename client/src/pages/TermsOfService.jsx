import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Globe, Scale, FileText } from 'lucide-react';
import SkyToggle from '../components/ui/sky-toggle';
import { BeamsBackground } from '@/components/ui/beams-background';
import './Legal.css';

export default function TermsOfService() {
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
                        <div className="legal-icon-wrap"><Scale size={24} /></div>
                        <h1>{T('Terms of Service', '\u0634\u0631\u0648\u0637 \u0627\u0644\u062e\u062f\u0645\u0629')}</h1>
                        <p className="legal-updated">{T('Last updated', '\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b')}: {lastUpdated}</p>
                    </div>

                    <div className="legal-body">
                        <section className="legal-section">
                            <h2>{T('1. Acceptance of Terms', '\u0661. \u0642\u0628\u0648\u0644 \u0627\u0644\u0634\u0631\u0648\u0637')}</h2>
                            <p>{T(
                                'By accessing or using Hesaby (\"the Platform\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Platform. These terms apply to all users, including company administrators, team members, and any person invited to access a workspace.',
                                '\u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0643 \u0623\u0648 \u0648\u0635\u0648\u0644\u0643 \u0625\u0644\u0649 \u062d\u0633\u0627\u0628\u064a (\"\u0627\u0644\u0645\u0646\u0635\u0629\")\u060c \u0641\u0625\u0646\u0643 \u062a\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645 \u0628\u0634\u0631\u0648\u0637 \u0627\u0644\u062e\u062f\u0645\u0629 \u0647\u0630\u0647. \u0625\u0630\u0627 \u0644\u0645 \u062a\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0648\u0637\u060c \u0644\u0627 \u064a\u062d\u0642 \u0644\u0643 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0645\u0646\u0635\u0629.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('2. Description of Service', '\u0662. \u0648\u0635\u0641 \u0627\u0644\u062e\u062f\u0645\u0629')}</h2>
                            <p>{T(
                                'Hesaby is a cloud-based construction and engineering ERP platform that provides financial management, project tracking, invoice processing, inventory management, workforce management, and AI-powered document analysis tools for construction companies and engineering firms.',
                                '\u062d\u0633\u0627\u0628\u064a \u0647\u064a \u0645\u0646\u0635\u0629 \u0633\u062d\u0627\u0628\u064a\u0629 \u0644\u062a\u062e\u0637\u064a\u0637 \u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062a \u0645\u062a\u062e\u0635\u0635\u0629 \u0641\u064a \u0642\u0637\u0627\u0639 \u0627\u0644\u0628\u0646\u0627\u0621 \u0648\u0627\u0644\u0647\u0646\u062f\u0633\u0629.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('3. Account Registration', '\u0663. \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062d\u0633\u0627\u0628')}</h2>
                            <p>{T(
                                'To use Hesaby, you must create an account by providing accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.',
                                '\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u062d\u0633\u0627\u0628\u064a\u060c \u064a\u062c\u0628 \u0639\u0644\u064a\u0643 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u0628\u062a\u0642\u062f\u064a\u0645 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u062f\u0642\u064a\u0642\u0629 \u0648\u0643\u0627\u0645\u0644\u0629. \u0623\u0646\u062a \u0645\u0633\u0624\u0648\u0644 \u0639\u0646 \u0627\u0644\u062d\u0641\u0627\u0638 \u0639\u0644\u0649 \u0633\u0631\u064a\u0629 \u0628\u064a\u0627\u0646\u0627\u062a \u062d\u0633\u0627\u0628\u0643.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('4. Subscription Plans & Billing', '\u0664. \u062e\u0637\u0637 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0648\u0627\u0644\u0641\u0648\u062a\u0631\u0629')}</h2>
                            <p>{T(
                                'Hesaby offers Free, Premium, and Enterprise subscription tiers. Paid subscriptions are billed monthly or annually. All fees are in Egyptian Pounds (EGP) unless otherwise stated. You may upgrade, downgrade, or cancel at any time. Downgrades take effect at the end of the current billing period.',
                                '\u064a\u0642\u062f\u0645 \u062d\u0633\u0627\u0628\u064a \u0628\u0627\u0642\u0627\u062a \u0645\u062c\u0627\u0646\u064a\u0629 \u0648\u0645\u0645\u064a\u0632\u0629 \u0648\u0628\u0627\u0642\u0629 \u0634\u0631\u0643\u0627\u062a. \u062c\u0645\u064a\u0639 \u0627\u0644\u0631\u0633\u0648\u0645 \u0628\u0627\u0644\u062c\u0646\u064a\u0647 \u0627\u0644\u0645\u0635\u0631\u064a. \u064a\u0645\u0643\u0646\u0643 \u0627\u0644\u062a\u0631\u0642\u064a\u0629 \u0623\u0648 \u0627\u0644\u062a\u062e\u0641\u064a\u0636 \u0623\u0648 \u0627\u0644\u0625\u0644\u063a\u0627\u0621 \u0641\u064a \u0623\u064a \u0648\u0642\u062a.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('5. User Data & Ownership', '\u0665. \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0648\u0627\u0644\u0645\u0644\u0643\u064a\u0629')}</h2>
                            <p>{T(
                                'You retain full ownership of all data you upload, enter, or generate through the Platform. Hesaby does not claim any ownership rights over your content. We process your data solely to provide and improve the service as described in our Privacy Policy.',
                                '\u062a\u062d\u062a\u0641\u0638 \u0628\u0627\u0644\u0645\u0644\u0643\u064a\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 \u0644\u062c\u0645\u064a\u0639 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u064a \u062a\u0642\u0648\u0645 \u0628\u062a\u062d\u0645\u064a\u0644\u0647\u0627 \u0623\u0648 \u0625\u062f\u062e\u0627\u0644\u0647\u0627 \u0639\u0628\u0631 \u0627\u0644\u0645\u0646\u0635\u0629. \u0644\u0627 \u064a\u062f\u0639\u064a \u062d\u0633\u0627\u0628\u064a \u0623\u064a \u062d\u0642\u0648\u0642 \u0645\u0644\u0643\u064a\u0629 \u0639\u0644\u0649 \u0645\u062d\u062a\u0648\u0627\u0643.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('6. Acceptable Use', '\u0666. \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0645\u0642\u0628\u0648\u0644')}</h2>
                            <p>{T(
                                'You agree not to: (a) use the Platform for any unlawful purpose; (b) upload fraudulent financial data; (c) attempt unauthorized access to other accounts; (d) reverse engineer any part of the Platform; (e) store or transmit malicious code; (f) resell access without written permission.',
                                '\u062a\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0639\u062f\u0645: (\u0623) \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0645\u0646\u0635\u0629 \u0644\u063a\u0631\u0636 \u063a\u064a\u0631 \u0642\u0627\u0646\u0648\u0646\u064a\u061b (\u0628) \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0627\u0644\u064a\u0629 \u0645\u0632\u0648\u0631\u0629\u061b (\u062c) \u0645\u062d\u0627\u0648\u0644\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 \u063a\u064a\u0631 \u0627\u0644\u0645\u0635\u0631\u062d \u0628\u0647\u061b (\u062f) \u0627\u0644\u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u0639\u0643\u0633\u064a\u0629\u061b (\u0647\u0640) \u062a\u062e\u0632\u064a\u0646 \u0623\u0643\u0648\u0627\u062f \u0636\u0627\u0631\u0629\u061b (\u0648) \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0628\u064a\u0639 \u062f\u0648\u0646 \u0625\u0630\u0646.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('7. AI Features Disclaimer', '\u0667. \u0625\u062e\u0644\u0627\u0621 \u0645\u0633\u0624\u0648\u0644\u064a\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a')}</h2>
                            <p>{T(
                                'Hesaby\'s AI-powered features (OCR invoice scanning, smart categorization, AI assistant) are provided for convenience. AI outputs should be reviewed by qualified personnel before use for official accounting, tax filing, or legal purposes. Hesaby is not liable for errors in AI-generated content.',
                                '\u064a\u062a\u0645 \u062a\u0648\u0641\u064a\u0631 \u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0644\u0644\u0631\u0627\u062d\u0629 \u0648\u0627\u0644\u0643\u0641\u0627\u0621\u0629. \u064a\u062c\u0628 \u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u062e\u0631\u062c\u0627\u062a \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0642\u0628\u0644 \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0647\u0627 \u0644\u0644\u0645\u062d\u0627\u0633\u0628\u0629 \u0627\u0644\u0631\u0633\u0645\u064a\u0629.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('8. Service Availability', '\u0668. \u062a\u0648\u0641\u0631 \u0627\u0644\u062e\u062f\u0645\u0629')}</h2>
                            <p>{T(
                                'We aim to maintain 99.9% uptime but do not guarantee uninterrupted access. Scheduled maintenance will be communicated in advance. We reserve the right to modify, suspend, or discontinue any part of the service with reasonable notice.',
                                '\u0646\u0633\u0639\u0649 \u0644\u0644\u062d\u0641\u0627\u0638 \u0639\u0644\u0649 \u0648\u0642\u062a \u062a\u0634\u063a\u064a\u0644 \u0669\u0669.\u0669\u066a \u0644\u0643\u0646\u0646\u0627 \u0644\u0627 \u0646\u0636\u0645\u0646 \u0627\u0644\u0648\u0635\u0648\u0644 \u062f\u0648\u0646 \u0627\u0646\u0642\u0637\u0627\u0639.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('9. Limitation of Liability', '\u0669. \u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0645\u0633\u0624\u0648\u0644\u064a\u0629')}</h2>
                            <p>{T(
                                'To the maximum extent permitted by law, Hesaby shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Platform.',
                                '\u0625\u0644\u0649 \u0623\u0642\u0635\u0649 \u062d\u062f \u064a\u0633\u0645\u062d \u0628\u0647 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u060c \u0644\u0646 \u064a\u0643\u0648\u0646 \u062d\u0633\u0627\u0628\u064a \u0645\u0633\u0624\u0648\u0644\u0627\u064b \u0639\u0646 \u0623\u064a \u0623\u0636\u0631\u0627\u0631 \u063a\u064a\u0631 \u0645\u0628\u0627\u0634\u0631\u0629 \u0623\u0648 \u062a\u0628\u0639\u064a\u0629.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('10. Governing Law', '\u0661\u0660. \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u062d\u0627\u0643\u0645')}</h2>
                            <p>{T(
                                'These Terms shall be governed by the laws of the Arab Republic of Egypt. Any disputes shall be subject to the exclusive jurisdiction of the courts of Cairo, Egypt.',
                                '\u062a\u062e\u0636\u0639 \u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0648\u0637 \u0644\u0642\u0648\u0627\u0646\u064a\u0646 \u062c\u0645\u0647\u0648\u0631\u064a\u0629 \u0645\u0635\u0631 \u0627\u0644\u0639\u0631\u0628\u064a\u0629. \u062a\u062e\u0636\u0639 \u0627\u0644\u0646\u0632\u0627\u0639\u0627\u062a \u0644\u0644\u0627\u062e\u062a\u0635\u0627\u0635 \u0627\u0644\u0642\u0636\u0627\u0626\u064a \u0644\u0645\u062d\u0627\u0643\u0645 \u0627\u0644\u0642\u0627\u0647\u0631\u0629.'
                            )}</p>
                        </section>

                        <section className="legal-section">
                            <h2>{T('11. Contact', '\u0661\u0661. \u0627\u0644\u062a\u0648\u0627\u0635\u0644')}</h2>
                            <p>{T('Questions about these Terms? Contact us at:', '\u0623\u0633\u0626\u0644\u0629 \u062d\u0648\u0644 \u0627\u0644\u0634\u0631\u0648\u0637\u061f \u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627:')}</p>
                            <p className="legal-contact"><FileText size={14} /><a href="mailto:hesabyaisupport@gmail.com">hesabyaisupport@gmail.com</a></p>
                        </section>
                    </div>

                    <div className="legal-bottom-links">
                        <Link to="/privacy">{T('Privacy Policy', '\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629')}</Link>
                        <span className="legal-dot">·</span>
                        <Link to="/">{T('Back to Home', '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0631\u0626\u064a\u0633\u064a\u0629')}</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
