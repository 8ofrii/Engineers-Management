import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft } from 'lucide-react';
import { BeamsBackground } from '@/components/ui/beams-background';
import './Legal.css';

export default function NotFound() {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const [theme] = useState(() => {
        const saved = localStorage.getItem('theme_preset_v3');
        if (!saved) return 'light';
        return saved === 'dark' ? 'dark' : 'light';
    });
    const light = theme === 'light';

    useEffect(() => {
        document.body.classList.toggle('light-mode', light);
    }, [light]);

    const T = (en, ar) => (isAr ? ar : en);

    return (
        <div className="notfound-container" dir={isAr ? 'rtl' : 'ltr'}>
            {!light && <BeamsBackground className="notfound-beams" intensity="subtle" />}
            <div className="notfound-content">
                <div className="notfound-code">404</div>
                <h1 className="notfound-title">{T('Page not found', '\u0627\u0644\u0635\u0641\u062d\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629')}</h1>
                <p className="notfound-desc">{T(
                    "The page you're looking for doesn't exist or has been moved. Let's get you back on track.",
                    '\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u062a\u064a \u062a\u0628\u062d\u062b \u0639\u0646\u0647\u0627 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629 \u0623\u0648 \u062a\u0645 \u0646\u0642\u0644\u0647\u0627. \u062f\u0639\u0646\u0627 \u0646\u0639\u064a\u062f\u0643 \u0625\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0635\u062d\u064a\u062d.'
                )}</p>
                <div className="notfound-actions">
                    <Link to="/" className="notfound-actions a nf-btn-primary"><Home size={16} />{T('Go Home', '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629')}</Link>
                    <Link to="/login" className="notfound-actions a nf-btn-ghost"><ArrowLeft size={16} />{T('Sign In', '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644')}</Link>
                </div>
            </div>
        </div>
    );
}
