import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, ArrowRight, Globe, HelpCircle, 
  Search, ChevronDown, Sparkles, MessageCircle, 
  CreditCard, ShieldCheck, Rocket, Layers, Mail
} from 'lucide-react';
import SkyToggle from '../components/ui/sky-toggle';
import { BeamsBackground } from '@/components/ui/beams-background';
import './Legal.css';

export default function FAQ() {
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

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState({ 0: true }); // first item open by default

  const toggleItem = (idx) => {
    setOpenItems(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const categories = [
    { id: 'all', label: T('All Questions', 'جميع الأسئلة') },
    { id: 'start', label: T('Getting Started', 'البداية والتشغيل') },
    { id: 'billing', label: T('Billing & Plans', 'الاشتراكات والأسعار') },
    { id: 'features', label: T('AI & Capabilities', 'الذكاء الاصطناعي والميزات') },
    { id: 'security', label: T('Security & Data', 'الأمان والبيانات') }
  ];

  const faqData = [
    // Getting Started
    {
      cat: 'start',
      q_en: 'What is Hesaby and who is it designed for?',
      q_ar: 'ما هي منصة حسابي ولمن صُممت؟',
      a_en: 'Hesaby is a specialized construction & engineering ERP platform built to streamline financial tracking, site custody, daily reports, and supplier accounts. It is tailored for general contractors, engineering consultancies, finishing firms, and project managers in Egypt and the MENA region.',
      a_ar: 'حسابي هي منصة سحابية متخصصة لإدارة المشروعات الهندسية والمقاولات، تركز على الحسابات الميدانية، تسويات العُهد، فواتير الموردين، ويوميات المواقع. صُممت خصيصاً لشركات المقاولات، مكاتب الاستشارات الهندسية، شركات التشطيب، والمهندسين المستقلين في مصر والشرق الأوسط.'
    },
    {
      cat: 'start',
      q_en: 'How quickly can our team get started on a live project?',
      q_ar: 'كم يستغرق بدء العمل الفعلي على مشروع؟',
      a_en: 'In less than 5 minutes! After creating your company account, you can create your first project, set up your project safes or custody balances, invite your site engineers, and start logging expenses or scanning invoices immediately.',
      a_ar: 'في أقل من 5 دقائق! بمجرد إنشاء حساب شركتك، يمكنك إضافة مشروعك الأول، وتحديد خزائن الموقع أو العُهد النقدية، ودعوة مهندسي الموقع لبدء تسجيل المصروفات ومسح الفواتير فوراً.'
    },
    {
      cat: 'start',
      q_en: 'Can I invite site engineers with restricted access?',
      q_ar: 'هل يمكن دعوة مهندسي الموقع بصلاحيات محددة فقط؟',
      a_en: 'Yes. Hesaby features fine-grained Role-Based Access Control (RBAC). You can assign roles such as Project Manager, Site Engineer, Accountant, or Auditor. Site engineers can be restricted to their assigned projects and their personal custody without viewing company-wide profits or bank lines.',
      a_ar: 'نعم بالتأكيد. يوفر حسابي نظاماً متطوراً لإدارة الصلاحيات (RBAC). يمكنك تحديد أدوار مثل مدير مشروع، مهندس موقع، محاسب، أو مراقب. يستطيع مهندس الموقع تسجيل عهدته ومصروفات مشروعه فقط دون الاطلاع على أرباح الشركة أو الحسابات البنكية المركزية.'
    },
    {
      cat: 'start',
      q_en: 'Does Hesaby work on mobile phones at the construction site?',
      q_ar: 'هل يعمل النظام على الهواتف الذكية في أرض الموقع؟',
      a_en: 'Absolutely. Hesaby is 100% responsive and optimized for mobile browsers. Site engineers can capture receipts with their phone camera, record worker counts, and submit custody reports directly from the site without needing a laptop.',
      a_ar: 'نعم بكل تأكيد. تم تصميم حسابي ليعمل بكفاءة فائقة على جميع الهواتف الذكية (iOS و Android). يستطيع المهندس تصوير الفواتير بكاميرا الموبايل، وتسجيل حضور العمالة، وتقديم تسويات العهدة مباشرة من قلب الموقع.'
    },

    // Billing & Plans
    {
      cat: 'billing',
      q_en: 'What payment methods do you support in Egypt?',
      q_ar: 'ما هي وسائل الدفع المدعومة داخل مصر؟',
      a_en: 'We support InstaPay, Vodafone Cash & Mobile Wallets, direct Egyptian Bank Wire Transfers, as well as Visa and Mastercard. For annual and enterprise subscriptions, we also offer corporate invoice billing with official tax receipts.',
      a_ar: 'ندعم الدفع الفوري عبر إنستاباي (InstaPay)، محفظة فودافون كاش والمحافظ الإلكترونية، التحويلات البنكية المباشرة، وبطاقات فيزا وماستركارد. كما نوفر فواتير ضريبية رسمية للاشتراكات السنوية وباقات الشركات.'
    },
    {
      cat: 'billing',
      q_en: 'Can I upgrade, downgrade, or cancel my plan at any time?',
      q_ar: 'هل يمكنني الترقية أو تغيير الخطة أو الإلغاء في أي وقت؟',
      a_en: 'Yes. You can upgrade to a higher tier or add project/user add-ons instantly from the Billing tab. If you downgrade, your active subscription remains valid until the end of the billing period, and your historical data remains fully accessible and safe.',
      a_ar: 'نعم. يمكنك الترقية إلى باقة أعلى أو إضافة مشاريع ومستخدمين جدد فوراً من صفحة الاشتراكات. وفي حال الرغبة في خفض الباقة أو الإلغاء، يظل حسابك فعالاً حتى نهاية فترة الاشتراك، وتظل بياناتك ومشاريعك السابقة محفوظة بأمان.'
    },
    {
      cat: 'billing',
      q_en: 'What happens if we reach our active project or user limits?',
      q_ar: 'ماذا يحدث إذا وصلنا إلى الحد الأقصى للمشاريع أو المستخدمين؟',
      a_en: 'You will never lose access to your existing data. Hesaby allows you to purchase individual add-on project slots or extra user seats as needed without being forced into a completely new pricing tier.',
      a_ar: 'لن تتوقف أعمالك أبداً. يمكنك ببساطة شراء حزم إضافية للمشاريع أو مقاعد إضافية للمستخدمين حسب الحاجة مباشرة من لوحة التحكم، دون الحاجة للترقية الإجبارية لباقة كاملة.'
    },

    // Features & AI
    {
      cat: 'features',
      q_en: 'How does the AI Invoice & Receipt scanning work?',
      q_ar: 'كيف يعمل المسح الذكي للفواتير بالذكاء الاصطناعي؟',
      a_en: 'When you take a photo of an invoice or upload a PDF, our advanced Vision AI extracts the vendor name, invoice date, total amount, VAT, and line items in seconds. It automatically maps the expense to the appropriate project category and transaction safe for review.',
      a_ar: 'عند التقاط صورة لفاتورة أو رفع ملف PDF، يقوم نموذج الذكاء الاصطناعي البصري بتحليل الفاتورة خلال ثوانٍ، واستخراج اسم المورد، التاريخ، القيمة الإجمالية، ضريبة القيمة المضافة، وبنود الشراء، مع اقتراح تصنيف البند والمشروع تلقائياً لتأكيده بضغطة زر.'
    },
    {
      cat: 'features',
      q_en: 'Can the AI read Arabic receipts and thermal printer receipts?',
      q_ar: 'هل يستطيع الذكاء الاصطناعي قراءة الفواتير العربية والإيصالات الحرارية؟',
      a_en: 'Yes! Our OCR models are specifically tuned for Arabic and English receipts common in the Egyptian market, including faded thermal receipts, handwritten site notes, and bilingual tax invoices.',
      a_ar: 'نعم! تم تدريب النماذج خصيصاً للتعامل مع الفواتير العربية والإنجليزية المنتشرة في السوق المصري، بما في ذلك إيصالات الطابعات الحرارية الباهتة، والفواتير الضريبية المطبوعة، وإيصالات الشراء اليومية.'
    },
    {
      cat: 'features',
      q_en: 'Can we export financial statements and project reports to Excel or PDF?',
      q_ar: 'هل يمكن تصدير كشوف الحساب والتقارير إلى Excel أو PDF؟',
      a_en: 'Yes. Every project ledger, safe statement, custody balance sheet, and workforce payout report can be exported in one click to cleanly formatted Excel spreadsheets and professional branded PDF reports ready for clients or accountants.',
      a_ar: 'نعم. كل كشف حساب، أو تقرير خزينة، أو تسوية عهدة، أو تقرير أجور عمالة يمكن تصديره بضغطة واحدة إلى ملفات Excel منسقة أو تقارير PDF احترافية جاهزة للطباعة والتقديم للعملاء والمحاسب القانوني.'
    },

    // Security & Data
    {
      cat: 'security',
      q_en: 'Who owns the financial and project data we upload?',
      q_ar: 'من يملك البيانات المالية والمستندات المرفوعة؟',
      a_en: 'You do. You retain 100% ownership of all data, invoices, client records, and documents uploaded to Hesaby. We never sell, monetize, or use your private financial records for third-party advertising.',
      a_ar: 'أنت وشركتك فقط. تحتفظ بالملكية القانونية الكاملة بنسبة 100% لكافة البيانات والفواتير وسجلات العملاء التي تدخلها. نحن لا نبيع ولا نشارك بياناتك المالية مع أي طرف ثالث لأغراض تجارية.'
    },
    {
      cat: 'security',
      q_en: 'How is our data protected and secured?',
      q_ar: 'كيف تتم حماية وتأمين بيانات شركتنا؟',
      a_en: 'All data is encrypted both in transit (TLS 1.3 / SSL) and at rest with AES-256 enterprise encryption. We maintain automated daily off-site backups, strict tenant isolation in our database layer, and offer optional Two-Factor Authentication (2FA) for all user accounts.',
      a_ar: 'يتم تشفير كافة البيانات أثناء النقل (TLS 1.3) وأثناء التخزين بتشفير متقدم (AES-256). نقوم بعمل نسخ احتياطية يومية مشفرة، ونطبق عزلاً صارماً لبيانات كل شركة، مع توفير خاصية المصادقة الثنائية (2FA) لحماية الحسابات من أي اختراق.'
    }
  ];

  // Filtering
  const filteredFaqs = useMemo(() => {
    return faqData.filter(item => {
      const matchCat = activeCategory === 'all' || item.cat === activeCategory;
      if (!matchCat) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const textEn = (item.q_en + ' ' + item.a_en).toLowerCase();
      const textAr = (item.q_ar + ' ' + item.a_ar).toLowerCase();
      return textEn.includes(q) || textAr.includes(q);
    });
  }, [activeCategory, searchQuery]);

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
            <div className="legal-icon-wrap"><HelpCircle size={26} /></div>
            <h1>{T('Frequently Asked Questions', 'الأسئلة الشائعة')}</h1>
            <p className="legal-updated">
              {T('Quick answers about Hesaby, billing, site workflows, and AI tools.', 'إجابات شاملة عن كل ما يخص منصة حسابي، الفواتير، والأمان.')}
            </p>
          </div>

          {/* Search Bar */}
          <div className="faq-search-box">
            <Search size={18} className="faq-search-icon" />
            <input 
              type="text" 
              className="faq-search-input"
              placeholder={T('Search questions or keywords (e.g. InstaPay, OCR, custody)...', 'ابحث في الأسئلة (مثال: إنستاباي، العهد، فواتير، تقارير)...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter Pills */}
          <div className="faq-categories">
            {categories.map(c => (
              <button
                key={c.id}
                type="button"
                className={`faq-cat-pill ${activeCategory === c.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* FAQ Accordion List */}
          <div className="faq-list">
            {filteredFaqs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary, #78716c)' }}>
                <p>{T('No questions matched your search query.', 'لم يتم العثور على نتائج مطابقة لبحثك.')}</p>
                <button 
                  type="button" 
                  className="contact-pill-btn" 
                  onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                  style={{ marginTop: 10 }}
                >
                  {T('Clear search filter', 'إعادة ضبط البحث')}
                </button>
              </div>
            ) : (
              filteredFaqs.map((faq, idx) => {
                const isOpen = !!openItems[idx];
                return (
                  <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => toggleItem(idx)}
                      aria-expanded={isOpen}
                    >
                      <span>{isAr ? faq.q_ar : faq.q_en}</span>
                      <ChevronDown size={18} className={`faq-chevron ${isOpen ? 'open' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="faq-answer-panel">
                        {isAr ? faq.a_ar : faq.a_en}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Help Banner */}
          <div className="faq-cta-banner">
            <h4>{T('Still have questions?', 'هل لديك استفسار آخر؟')}</h4>
            <p>
              {T(
                "Can't find what you're looking for? Reach out directly to our engineering support team.",
                'لم تجد الإجابة التي تبحث عنها؟ يسعدنا تواصلك المباشر مع فريق الدعم الفني.'
              )}
            </p>
            <div className="faq-cta-actions">
              <Link to="/contact" className="faq-cta-btn-primary">
                <Mail size={16} />
                <span>{T('Contact Support', 'تواصل مع الدعم')}</span>
              </Link>
              <Link to="/signup" className="faq-cta-btn-secondary">
                <Rocket size={16} />
                <span>{T('Start Free Trial', 'ابدأ التجربة المجانية')}</span>
              </Link>
            </div>
          </div>

          <div className="legal-bottom-links">
            <Link to="/about">{T('About Us', 'عن حسابي')}</Link>
            <span className="legal-dot">·</span>
            <Link to="/contact">{T('Contact Us', 'تواصل معنا')}</Link>
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
