import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, ArrowRight, Globe, Building2, 
  Cpu, Wallet, HardHat, TrendingUp, ShieldCheck, 
  CheckCircle2, Sparkles, Mail, FileText, Scale
} from 'lucide-react';
import SkyToggle from '../components/ui/sky-toggle';
import { BeamsBackground } from '@/components/ui/beams-background';
import './Legal.css';

export default function About() {
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

  const stats = [
    { value: '10x', label: T('Faster Invoice Entry (AI Vision)', 'تسريع تسجيل الفواتير بالذكاء الاصطناعي') },
    { value: '100%', label: T('Custody & Safe Accountability', 'مطابقة كاملة للعهد والخزائن') },
    { value: '0', label: T('Lost Paper Receipts on Site', 'فواتير أو أوراق مفقودة في الموقع') },
    { value: '24/7', label: T('Real-Time Margin Visibility', 'رؤية لحظية ومستمرة لتكلفة المشاريع') }
  ];

  const features = [
    {
      icon: <Wallet size={22} />,
      title: T('Smart Safes & Multi-Custody', 'الخزائن الذكية وتسويات العُهد'),
      desc: T(
        'Manage site petty cash, supplier payments, and subcontractor advances with iron-clad transaction logs and automated balance reconciliations.',
        'إدارة دقيقة للخزائن والعهد الميدانية، ودفعات الموردين ومقاولي الباطن، مع سجل معاملات لحظي وتسويات غير قابلة للتلاعب.'
      )
    },
    {
      icon: <Cpu size={22} />,
      title: T('AI Invoice & Receipt OCR', 'المسح الضوئي الذكي للفواتير'),
      desc: T(
        'Snap a thermal or printed receipt directly from mobile. Our AI extracts vendor names, totals, dates, tax numbers, and items in seconds.',
        'التقط صورة لأي فاتورة أو إيصال حراري من هاتفك. يتعرف الذكاء الاصطناعي على المورد، القيمة، التاريخ، وبنود الصرف خلال ثوانٍ.'
      )
    },
    {
      icon: <TrendingUp size={22} />,
      title: T('True Project Costing & Margins', 'تحديد تكاليف المشاريع وصافي الأرباح'),
      desc: T(
        'Live tracking of actual vs budgeted expenses per project. Know your exact fee and margins down to the last pound before month-end.',
        'متابعة حية للمصروفات الفعلية مقابل الميزانية التقديرية لكل موقع. اعرف أرباحك وتكاليفك بدقة متناهية ودون انتظار نهاية الشهر.'
      )
    },
    {
      icon: <HardHat size={22} />,
      title: T('Workforce & Site Execution Logs', 'إدارة العمالة وسجلات التنفيذ اليومية'),
      desc: T(
        'Log daily workforce counts, wage payouts, supplier delivery dockets, and site progress notes in one synchronized hub.',
        'تسجيل أعداد العمالة واليوميات والعهد المصروفة، ومحاضر استلام التوريدات وسجلات الإنجاز اليومية في منصة مركزية موحدة.'
      )
    }
  ];

  const values = [
    {
      title: T('Built for the Reality of Site Work', 'مُصمم لواقع العمل في المواقع'),
      desc: T(
        'We know construction happens in dust, heat, and spotty internet. Hesaby is fast, lightweight, and frictionless for engineers on the go.',
        'ندرك أن مواقع البناء بيئة عمل مليئة بالحركة والتحديات. لذلك صممنا حسابي ليكون فائق السرعة، بسيطاً، وقابلاً للاستخدام الميداني الفوري.'
      )
    },
    {
      title: T('100% Data Sovereignty & Auditability', 'سيادة كاملة على البيانات وأمان مطلق'),
      desc: T(
        'Your financial data belongs solely to your company. Every edit, approval, and transaction leaves an immutable audit trail.',
        'بياناتك المالية ملك خاص لشركتك فقط. كل عملية اعتماد أو تحويل مالي تترك سجلاً رقمياً واضحاً يحمي حقوق الجميع.'
      )
    },
    {
      title: T('Engineering-Grade Simplicity', 'بساطة هندسية بلا تعقيد'),
      desc: T(
        'Traditional ERPs require weeks of expensive training. Hesaby is designed to be mastered by any site engineer in less than 15 minutes.',
        'أنظمة المحاسبة التقليدية تتطلب شهوراً من التدريب المكلف. حسابي صُمم ليتقنه أي مهندس موقع أو محاسب في أقل من 15 دقيقة.'
      )
    }
  ];

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

      <div className="legal-content">
        <div className="legal-card">
          <div className="legal-header">
            <div className="legal-icon-wrap"><Building2 size={26} /></div>
            <h1>{T('About Hesaby', 'عن منصة حسابي')}</h1>
            <p className="legal-updated">
              {T('Engineered in Cairo for construction firms across Egypt & MENA', 'صُمم في القاهرة لخدمة شركات المقاولات والهندسة في مصر والشرق الأوسط')}
            </p>
          </div>

          <div className="about-hero-banner">
            {T(
              'Hesaby was born out of real construction site frustration. We spent years witnessing millions in lost receipts, endless spreadsheet errors, and toxic disputes over custody settlements. We built Hesaby to give every contractor, engineering consultant, and project manager absolute financial control.',
              'وُلدت منصة "حسابي" من قلب المعاناة الحقيقية في مواقع البناء والتشييد. لسنوات طويلة، شاهدنا ملايين الجنيهات تُهدر بسبب الفواتير الضائعة، وأخطاء جداول الإكسيل، ونزاعات تسوية العُهد النقدية. بنينا حسابي لنمنح كل شركة مقاولات ومكتب هندسي تحكماً مالياً شاملاً وموثوقاً.'
            )}
          </div>

          <div className="about-metrics-grid">
            {stats.map((s, idx) => (
              <div key={idx} className="about-metric-card">
                <div className="about-metric-val">{s.value}</div>
                <div className="about-metric-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="legal-body">
            <section className="legal-section">
              <h2>{T('What We Do', 'ماذا تقدم المنصة؟')}</h2>
              <p>
                {T(
                  'Hesaby bridges the gap between on-site field execution and the executive accounting desk. Our cloud-native ERP delivers unified project oversight:',
                  'حسابي يسد الفجوة بين التنفيذ الميداني في مواقع العمل ومكتب الإدارة المالية. نقدم منصة سحابية شاملة ومصممة خصيصاً للمقاولات:'
                )}
              </p>
              
              <div className="about-features-grid">
                {features.map((f, idx) => (
                  <div key={idx} className="about-feat-card">
                    <div className="about-feat-icon">{f.icon}</div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="legal-section">
              <h2>{T('Our Core Principles', 'مبادئنا الأساسية')}</h2>
              <div className="about-values-list">
                {values.map((v, idx) => (
                  <div key={idx} className="about-val-item">
                    <CheckCircle2 size={20} className="about-val-bullet" />
                    <div>
                      <strong>{v.title}</strong>
                      <span>{v.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="legal-section">
              <h2>{T('Headquarters & Support', 'المقر والدعم الفني')}</h2>
              <p>
                {T(
                  'Hesaby is headquartered in Cairo, Egypt. Our dedicated engineering and customer success teams are always available to help you configure your company safes, migrate your historical project data, and train your site engineers.',
                  'يقع المقر الرئيسي لمنصة حسابي في القاهرة، مصر. فريق الدعم الفني والهندسي متواجد دائماً لمساعدتك في إعداد خزائن شركتك، ونقل بيانات مشروعاتك السابقة، وتدريب مهندسي الموقع.'
                )}
              </p>
              <p className="legal-contact" style={{ marginTop: 12 }}>
                <Mail size={16} />
                <a href="mailto:support@hesaby.app">support@hesaby.app</a>
              </p>
            </section>
          </div>

          <div className="legal-bottom-links">
            <Link to="/contact">{T('Contact Us', 'تواصل معنا')}</Link>
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
