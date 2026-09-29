import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, ArrowRight, Globe, Mail, 
  Clock, Send, CheckCircle2, Copy, Check,
  Sparkles, HelpCircle
} from 'lucide-react';
import SkyToggle from '../components/ui/sky-toggle';
import { BeamsBackground } from '@/components/ui/beams-background';
import './Legal.css';

const SUPPORT_EMAIL = 'hesabyaisupport@gmail.com';

export default function Contact() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme_preset_v3');
    if (!saved) return 'light';
    return saved === 'dark' ? 'dark' : 'light';
  });
  const light = theme === 'light';

  useEffect(() => {
    window.scrollTo(0, 0);
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

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('support');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const quickPills = [
    { id: 'demo', label: T('Schedule Demo', 'طلب عرض توضيحي') },
    { id: 'pricing', label: T('Enterprise Pricing', 'استفسار عن خطط الشركات') },
    { id: 'support', label: T('Technical Assistance', 'مساعدة ودعم فني') },
    { id: 'feedback', label: T('Feature Request', 'اقتراح ميزة جديدة') }
  ];

  const handlePillClick = (pill) => {
    setTopic(pill.id);
    if (!message) {
      if (pill.id === 'demo') {
        setMessage(T('Hello, I would like to schedule a quick demo of Hesaby for our team.', 'مرحباً، أود حجز موعد لعرض توضيحي لمنصة حسابي لفريقنا.'));
      } else if (pill.id === 'pricing') {
        setMessage(T('Hello, I would like more details about your enterprise multi-company plans.', 'مرحباً، أود الاستفسار عن باقات الشركات الكبرى والمشاريع غير المحدودة.'));
      }
    }
  };

  const copyEmailToClipboard = () => {
    navigator.clipboard?.writeText(SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setLoading(true);
    const subject = encodeURIComponent(`[Hesaby Contact - ${topic.toUpperCase()}] from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nTopic: ${topic}\n\nMessage:\n${message}`
    );

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      try {
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
      } catch (err) {
        console.log('Mail client invocation fallback', err);
      }
    }, 500);
  };

  return (
    <div className="legal-container" dir={isAr ? 'rtl' : 'ltr'}>
      {!light && <BeamsBackground className="legal-beams" intensity="subtle" />}
      <div className="legal-background" />

      <div className="legal-topbar">
        <Link to="/" className="legal-back-btn">
          {isAr ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          <span>{T('Back to Home', 'العودة للرئيسية')}</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="legal-lang-btn" onClick={toggleLanguage}>
            <Globe size={14} />
            <span>{isAr ? 'EN' : 'عربي'}</span>
          </button>
          <SkyToggle checked={!light} onChange={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} size={18} />
        </div>
      </div>

      <div className="legal-content" style={{ maxWidth: 880 }}>
        <div className="legal-card" style={{ padding: '44px 36px' }}>
          <div className="legal-header">
            <div className="legal-icon-wrap"><Mail size={26} /></div>
            <h1>{T('Contact Us', 'تواصل معنا')}</h1>
            <p className="legal-updated">
              {T("We're here to help you power up your engineering projects.", 'فريقنا جاهز لمساعدتك والإجابة على أي استفسارات تخص مشروعاتك.')}
            </p>
          </div>

          <div className="contact-grid">
            {/* Left Column: Direct Info (Location Card Removed) */}
            <div className="contact-info-col">
              <div className="contact-card">
                <div className="contact-card-icon"><Mail size={20} /></div>
                <h4>{T('Direct Email Support', 'البريد الإلكتروني المباشر')}</h4>
                <p>{T('For technical questions, billing inquiries, or account help.', 'للمساعدة الفنية، المشكلات، الاشتراكات، أو إدارة الحساب.')}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <a href="mailto:hesabyaisupport@gmail.com" className="contact-link" style={{ fontSize: '0.92rem' }}>
                    hesabyaisupport@gmail.com
                  </a>
                  <button 
                    type="button" 
                    onClick={copyEmailToClipboard}
                    className="contact-pill-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px' }}
                    title={T('Copy to clipboard', 'نسخ إلى الحافظة')}
                  >
                    {copied ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                    <span>{copied ? T('Copied!', 'تم النسخ!') : T('Copy', 'نسخ')}</span>
                  </button>
                </div>
              </div>

              <div className="contact-card">
                <div className="contact-card-icon"><Clock size={20} /></div>
                <h4>{T('Response Commitment', 'سرعة الاستجابة')}</h4>
                <p>{T('We review incoming messages regularly and typically respond within a few hours.', 'نراجع الرسائل بانتظام ونقوم بالرد في أسرع وقت ممكن.')}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', color: '#ff8a50', fontWeight: 600 }}>
                  <CheckCircle2 size={15} />
                  <span>{T('Direct Support from the Core Team', 'دعم مباشر وسريع من فريق العمل')}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className="contact-form-col">
              {submitted ? (
                <div className="contact-success-box">
                  <CheckCircle2 size={44} style={{ margin: '0 auto 12px' }} />
                  <h4>{T('Message Ready & Sent!', 'تم تجهيز رسالتك بنجاح!')}</h4>
                  <p>
                    {T(
                      'Your email client has been prompted to send your message to hesabyaisupport@gmail.com. We will review and reply promptly.',
                      'تم تجهيز الرسالة لإرسالها عبر بريدك إلى hesabyaisupport@gmail.com. سنقوم بالمراجعة والرد عليك في أسرع وقت.'
                    )}
                  </p>
                  <button 
                    type="button" 
                    className="legal-submit-btn" 
                    onClick={() => { setSubmitted(false); setMessage(''); }}
                    style={{ maxWidth: 220, margin: '0 auto' }}
                  >
                    {T('Send Another Message', 'إرسال رسالة أخرى')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="contact-form-title">{T('Send Us a Message', 'أرسل لنا استفسارك')}</div>
                  <div className="contact-form-sub">
                    {T('Fill in the details below and we will get back to you promptly.', 'املأ البيانات التالية وسنتواصل معك في أسرع وقت.')}
                  </div>

                  <div className="contact-quick-pills">
                    {quickPills.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className={`contact-pill-btn ${topic === p.id ? 'active' : ''}`}
                        onClick={() => handlePillClick(p)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="legal-form-group">
                    <label>{T('Your Name', 'الاسم الكامل')} *</label>
                    <input 
                      type="text" 
                      required 
                      className="legal-input" 
                      placeholder={T('Eng. Ahmed Hassan', 'م. أحمد حسن')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="legal-form-group">
                    <label>{T('Work Email', 'البريد الإلكتروني')} *</label>
                    <input 
                      type="email" 
                      required 
                      className="legal-input" 
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="legal-form-group">
                    <label>{T('Phone / WhatsApp (Optional)', 'رقم الهاتف / واتساب (اختياري)')}</label>
                    <input 
                      type="tel" 
                      className="legal-input" 
                      placeholder="+20 100 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="legal-form-group">
                    <label>{T('Inquiry Subject', 'نوع الاستفسار')}</label>
                    <select 
                      className="legal-select"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    >
                      <option value="support">{T('Technical Support & Assistance', 'دعم فني ومساعدة تقنية')}</option>
                      <option value="pricing">{T('Plans & Corporate Billing', 'الاشتراكات وباقات الشركات')}</option>
                      <option value="demo">{T('Request a Product Demo', 'طلب عرض توضيحي للمنصة')}</option>
                      <option value="feedback">{T('Feedback or Feature Request', 'اقتراح ميزة أو ملاحظات')}</option>
                    </select>
                  </div>

                  <div className="legal-form-group">
                    <label>{T('Message Details', 'تفاصيل الرسالة')} *</label>
                    <textarea 
                      required 
                      className="legal-textarea"
                      placeholder={T('How can we help your team?', 'كيف يمكننا مساعدة فريقك وإدارة مشاريعك؟')}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="legal-submit-btn" 
                    disabled={loading || !name || !email || !message}
                  >
                    {loading ? (
                      <span>{T('Sending...', 'جاري الإرسال...')}</span>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>{T('Send Message', 'إرسال الرسالة')}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="legal-bottom-links">
            <Link to="/about">{T('About Us', 'عن حسابي')}</Link>
            <span className="legal-dot">·</span>
            <Link to="/faq">{T('FAQ', 'الأسئلة الشائعة')}</Link>
            <span className="legal-dot">·</span>
            <Link to="/terms">{T('Terms of Service', 'شروط الخدمة')}</Link>
            <span className="legal-dot">·</span>
            <Link to="/privacy">{T('Privacy Policy', 'سياسة الخصوصية')}</Link>
            <span className="legal-dot">·</span>
            <Link to="/">{T('Back to Home', 'العودة للرئيسية')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
