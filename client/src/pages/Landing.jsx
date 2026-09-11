import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { billingAPI } from '../services/api';
import { useFormat } from '../utils/format';
import { Camera, Check, Globe, ShieldCheck, HardHat, Scale, DollarSign, Receipt, FileSpreadsheet, TrendingUp, Smartphone, Zap, Play, CheckCircle2 } from 'lucide-react';
import SkyToggle from '@/components/ui/sky-toggle';
import HandwritingText from '@/components/ui/handwriting-text';
import { AuroraBackground } from '@/components/ui/aurora-background';
import DisplayCards from '@/components/ui/display-cards';
import { LampContainer } from '@/components/ui/lamp';
import TubeNav from '@/components/ui/tubelight-navbar';
import { motion, MotionConfig } from 'framer-motion';
import { cn } from '@/lib/utils';
import './Landing.css';

const SCEN = [
  { id:'ezz', tAr:'فاتورة حديد عز', tEn:'Ezz Steel', vAr:'حديد عز', vEn:'Ezz Steel', pAr:'برج الأمل', pEn:'Al-Amal Tower', amt:'185,000 EGP', amtAr:'185,000 ج.م', vat:'25,900 EGP', vatAr:'25,900 ج.م', itemsAr:'4 طن حديد 16مم و12مم', itemsEn:'4t rebar 16/12mm', conf:'99.8%' },
  { id:'laf', tAr:'فاتورة لافارج', tEn:'Lafarge', vAr:'لافارج مصر', vEn:'Lafarge Egypt', pAr:'فيلا التجمع', pEn:'New Cairo Villa', amt:'42,600 EGP', amtAr:'42,600 ج.م', vat:'5,964 EGP', vatAr:'5,964 ج.م', itemsAr:'15 طن أسمنت', itemsEn:'15t cement', conf:'99.4%' },
  { id:'fuel', tAr:'إيصال وقود', tEn:'Fuel receipt', vAr:'وطنية', vEn:'Watanya', pAr:'العاصمة الإدارية', pEn:'New Capital', amt:'8,500 EGP', amtAr:'8,500 ج.م', vat:'1,190 EGP', vatAr:'1,190 ج.م', itemsAr:'سولار للحفار والمولد', itemsEn:'Diesel — excavator', conf:'99.1%' },
];
const PLANS = [
  { key:'FREE', n:'Starter', nAr:'البداية', d:'Test Hesaby on one real site. No credit card, no time limit.', dAr:'جرّب حسابي في موقع حقيقي. من غير كارت فيزا ولا مدة صلاحية.', price:0, f:['Up to 2 active projects','2 engineer seats','150 AI receipt scans / mo','Full DSR site diaries','Site custody & mobile app'], fAr:['مشروعين هندسيين نشطين','حسابين للمهندسين','١٥٠ مسحة فاتورة بالذكاء الاصطناعي شهرياً','يوميات الموقع كاملة (DSR)','محفظة العهدة وتطبيق الموبايل'] },
  { key:'PREMIUM', n:'Active Contractor', nAr:'المقاول النشط', d:'For growing contractors needing live safe tracking and real-time site control.', dAr:'لشركات المقاولات اللي شغّالة في كذا موقع ومحتاجة تتابع الخزاين أول بأول.', price:2450, pop:true, f:['Up to 10 active projects','15 multi-role team seats','2,500 AI receipt scans & voice notes','Multi-tier financial approvals','Daily wages, draws & stock'], fAr:['١٠ مشاريع هندسية نشطة','١٥ مستخدم بصلاحيات متعددة','٢,٥٠٠ مسحة فاتورة وملاحظة صوتية بالذكاء الاصطناعي','اعتمادات صرف متعددة المستويات','يوميات عمالة ومستخلصات ومخازن'] },
  { key:'BUSINESS', n:'Multi-Site', nAr:'شركات المقاولات', d:'For established contractors running multi-site operations with Egyptian VAT & isolated safes.', dAr:'للشركات الكبيرة اللي بتدير مواقع متزامنة ومحتاجة عزل تام للخزائن وقيد ضريبي ١٤٪.', price:4450, f:['Up to 30 active projects','40 team seats & custom roles','6,000 AI extractions & actions','Site-fenced safes & 14% Egyptian VAT','Bank reconciliation & sealed audit log'], fAr:['٣٠ مشروع نشط','٤٠ مستخدم مع سجل صلاحيات كامل','٦,٠٠٠ عملية ذكاء اصطناعي','خزائن مسيّجة لكل موقع وضريبة القيمة المضافة ١٤٪','مطابقة بنكية وسجل تدقيق مقفول'] },
  { key:'ENTERPRISE', n:'Enterprise', nAr:'المؤسسات الكبرى', d:'Dedicated infrastructure, custom SLAs, and unlimited capacity for large developers.', dAr:'خادم وقاعدة بيانات معزولة بالكامل، ودعم مباشر على مدار الساعة، وربط مخصص.', price:null, f:['Unlimited projects & subcontracts','Unlimited team seats & custom RBAC','Dedicated isolated database instance','Unlimited AI volume & custom SLA','Direct ERP API & dedicated support engineer'], fAr:['مشاريع ومقاولين باطن غير محدودين','مستخدمين وصلاحيات غير محدودة','قاعدة بيانات مخصصة ومعزولة تمامًا','استهلاك ذكاء اصطناعي غير محدود مع SLA','ربط أنظمة ERP ومهندس دعم مخصص'] },
];

export default function Landing() {
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { currency } = useFormat();
  const [plans] = useState(PLANS);
  const [cycle, setCycle] = useState('monthly');
  const [tab, setTab] = useState('ocr');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme_preset_v3');
    if (!saved) return 'light';
    return saved === 'dark' ? 'dark' : 'light';
  });
  const light = theme === 'light';
  const [amt, setAmt] = useState(25000);
  const [sel, setSel] = useState(0);
  const [posted, setPosted] = useState(false);
  const isRTL = i18n.language === 'ar';
  const T = (en, ar) => (isRTL ? ar : en);
  useEffect(() => { 
    const p = new URLSearchParams(window.location.search).get('lang');
    if (p && (p === 'ar' || p === 'en') && p !== i18n.language) {
      i18n.changeLanguage(p);
      document.documentElement.dir = p === 'ar' ? 'rtl' : 'ltr';
    }
  }, [i18n]);
  useEffect(() => { 
    document.body.classList.toggle('light-mode', light); 
    localStorage.setItem('theme_preset', theme); 
    localStorage.setItem('theme_preset_v3', theme);
  }, [theme, light]);
  useEffect(() => { billingAPI.listPlans().catch(() => {}); }, []);
  /* scroll reveals: .rv elements fade/rise in once when scrolled into view */
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('rv-on')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { en.target.classList.toggle('rv-on', en.isIntersecting); });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  /* subtle pointer tilt on the dashboard frame (desktop, motion-safe only) */
  const frameRef = useRef(null);
  const onTilt = (e) => {
    const el = frameRef.current;
    if (!el || (e.pointerType && e.pointerType !== 'mouse')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${(px * 5).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-py * 5).toFixed(2)}deg`);
  };
  const offTilt = () => {
    const el = frameRef.current;
    if (el) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
  };
  const go = (e, id) => { e?.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior:'smooth' }); };
  const sc = SCEN[sel];
  const appr = amt <= 5000 ? { r:T('Site Engineer','مهندس الموقع'), c:'#22c55e' } : amt <= 50000 ? { r:T('Project Manager','مدير المشروع'), c:'#ff5a1f' } : { r:T('General Manager','المدير العام'), c:'#ef4444' };
  const tabs = [{k:'ocr',l:T('Receipt OCR','مسح الفواتير'),i:Camera},{k:'safes',l:T('Safes','الخزائن'),i:DollarSign},{k:'dsr',l:T('Site reports','تقارير الموقع'),i:HardHat},{k:'recon',l:T('Bank match','المطابقة'),i:Scale},{k:'approval',l:T('Approvals','الاعتمادات'),i:ShieldCheck}];
  /* tubelight nav: scrollspy drives the lamp, clicks jump + set it */
  const [active, setActive] = useState('preview');
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 1020px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1020px)');
    const fn = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  useEffect(() => {
    const secs = ['preview', 'modules', 'why', 'pricing'].map((sid) => document.getElementById(sid)).filter(Boolean);
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((en) => { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-38% 0px -55% 0px' });
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
  const navItems = [
    { key: 'preview', label: T('Product', 'المنتج') },
    { key: 'modules', label: T('Modules', 'الموديولات') },
    { key: 'why', label: T('Why Hesaby', 'ليه حسابي') },
    { key: 'pricing', label: T('Pricing', 'الأسعار') },
  ];
  const pick = (it) => { setActive(it.key); go(null, it.key); };

  return (
    <MotionConfig reducedMotion="user">
    <div ref={rootRef} className={cn('hx', light && 'hx-light')} dir={isRTL ? 'rtl' : 'ltr'}>
      <AuroraBackground />
      <header className="hx-nav"><div className="hx-inner hx-nav-row">
        <Link to="/" className="hx-brand"><img src="/hesaby_logo_lockup.svg" alt="Hesaby.ai" className="hx-logo-lockup logo-for-dark" /><img src="/hesaby_logo_lockup_light.svg" alt="Hesaby.ai" className="hx-logo-lockup logo-for-light" /></Link>
        <div className="tube-top"><TubeNav id="tube-top" items={navItems} active={active} onSelect={pick} /></div>
        <div className="hx-actions">
          <SkyToggle dark={!light} onToggle={()=>setTheme(light?'dark':'light')} label={isRTL ? (light ? 'التحويل للوضع الليلي' : 'التحويل للوضع الفاتح') : (light ? 'Switch to dark mode' : 'Switch to light mode')} />
          <button 
            type="button" 
            className="hx-lang-btn" 
            onClick={()=>{const n=isRTL?'en':'ar';i18n.changeLanguage(n);document.documentElement.dir=n==='ar'?'rtl':'ltr';}}
            title={isRTL ? 'Switch to English' : 'التحويل للعربية'}
          >
            <Globe size={13} />
            <span>{isRTL ? 'EN' : 'عربي'}</span>
          </button>
          {user ? (
            <>
              <Link to="/dashboard" className="hx-btn hx-btn-fire hx-btn-sm">{T('Dashboard','لوحة التحكم')}</Link>
              <button onClick={logout} className="hx-login-btn">{T('Out','خروج')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hx-login-btn">{T('Log in','دخول')}</Link>
              <Link to="/signup" className="hx-btn hx-btn-fire hx-btn-sm">{T('Start free','ابدأ مجانًا')}</Link>
            </>
          )}
        </div></div></header>

      <div className="hx-stage"><div className="hx-ember"/><div className="hx-grain"/>
        <div className="hx-inner hx-hero">
          <h1 className="hx-h1"><span>{T('Snap a receipt.','فاتورة؟')}</span><span>{T('It posts itself.','صوت؟ صورة؟')}</span><span className="hx-hw"><HandwritingText text={T('Your site has a brain now.','كله بحسابه')} arabic={isRTL} replayKey={`${i18n.language}-${theme}`} /></span></h1>
          <p className="hx-sub">{T('Hesaby turns site chaos into clean books: photograph an invoice on the scaffold and it lands in the right project safe with vendor, VAT and audit trail — before you climb down. Daily reports, custody, approvals and bank matching all run on the same ledger, so month-end closing runs smoothly without pressure or surprises.','حسابي بيحوّل فوضى الموقع لدفاتر نضيفة: صوّر الفاتورة وانت على السقالة، وهتنزل في خزينة المشروع الصح بالمورّد والضريبة وسجل التدقيق — قبل ما تنزل انت. التقارير اليومية والعهد والاعتمادات والمطابقة البنكية كلهم على نفس الدفتر، فإقفال آخر الشهر يبطّل يكون ضغط وتوتر ومفاجآت.')}</p>
          <div className="hx-ctas"><Link to={user?'/dashboard':'/signup'} className="hx-btn hx-btn-fire">{T('Start free','ابدأ مجانًا')}</Link><a href="#preview" onClick={(e)=>go(e,'preview')} className="hx-btn hx-btn-ghost"><Play size={14}/>{T('See it in action','شوفه شغّال')}</a></div>
          <div className="hx-micro">{T('No credit card required · Ready in minutes · Built for Egyptian contracting','بدون بطاقة بنكية · تجربة فورية جاهزة في دقائق · مصمم لشركات المقاولات في مصر')}</div>
        </div>

        <div className="hx-inner hx-frame-wrap" id="preview">
          <div className="hx-head rv"><div className="hx-eyebrow">{T('Interactive demo','تجربة تفاعلية')}</div><h2 className="hx-h2">{T('Test-drive the site ledger right here.','جرّب دفتر الموقع بنفسك.')}</h2><p className="hx-lead">{T('No dummy data or video loops — this is the actual engine. Scan a real invoice, move site safes, file a diary, or run a bank match. Pick a tab and see.','مش فيديوهات ولا بيانات وهمية — دا الشغل الحقيقي. امسح فاتورة، حرّك خزاين الموقع، قدّم يومية، أو طابق البنك. اختار تاب وشوف بنفسك.')}</p></div>
          <div className="hx-tabs rv" style={{'--rv-d':'.12s'}}>{tabs.map(t=><button key={t.k} onClick={()=>setTab(t.k)} className={cn('hx-tab',tab===t.k&&'on')}><t.i size={14}/>{t.l}</button>)}</div>
          <div ref={frameRef} onPointerMove={onTilt} onPointerLeave={offTilt} className="hx-frame tilt rv" style={{'--rv-d':'.2s'}}>
            <div className="hx-fbar"><span className="hx-dots"><i/><i/><i/></span><span className="hx-furl">hesaby.ai/app/{tab}</span><span className="hx-live"><span className="hx-pulse"/>{T('LIVE','مباشر')}</span></div>
            <div className="hx-fbody" key={tab}>
              {tab==='ocr'&&(<><div><h3 className="hx-h3">{T('Photograph it. It reads itself.','صوّرها. هتقرا نفسها.')}</h3><p className="hx-p">{T('Point your phone at any Arabic or English invoice — the AI pulls vendor name, tax registration, line items and the 14% VAT split in seconds, no typing. Pick a scenario below, then hit approve: the money leaves the project safe, VAT posts to the tax ledger, and an audit trail seals itself shut.','وجّه تليفونك على أي فاتورة عربي أو إنجليزي — الذكاء الاصطناعي بيطلّع اسم المورّد والرقم الضريبي والبنود وتفصيل ضريبة ١٤٪ في ثواني، من غير ما تكتب حرف. اختار سيناريو تحت، وبعدين اعتمد: المبلغ بيخرج من خزينة المشروع، الضريبة بتترحّل لدفتر الضرائب، وسجل التدقيق بيتقفل لوحده.')}</p>
                <div className="hx-pick">{SCEN.map((s,i)=><button key={s.id} onClick={()=>{setSel(i);setPosted(false);}} className={cn(i===sel&&'on')}>{isRTL?s.tAr:s.tEn}</button>)}</div>
                {!posted?<button className="hx-btn hx-btn-fire" onClick={()=>setPosted(true)}><Camera size={15}/>{T('Approve & post','اعتماد وترحيل')}</button>:<button className="hx-btn hx-btn-ghost" onClick={()=>setPosted(false)}>{T('Try another','جرّب غيرها')}</button>}<p className="hx-p" style={{fontSize:12.5,marginTop:12,marginBottom:0}}>{T('Every scan shows a confidence score. Low-confidence fields get flagged — nothing posts silently.','كل مسحة بتبيّن نسبة الثقة. الحقول الضعيفة بتتعلّم — مفيش حاجة بتترحّل بالسكوت.')}</p></div>
                <div className="hx-card"><div className="hx-card-top"><span>{isRTL?sc.vAr:sc.vEn} → {isRTL?sc.pAr:sc.pEn}</span><span className="hx-conf">{sc.conf}</span></div>
                {!posted?<><div className="hx-note"><strong>{T('Items: ','البنود: ')}</strong>{isRTL?sc.itemsAr:sc.itemsEn}</div><div className="hx-kv"><div className="hx-cell"><label>{T('Total','الإجمالي')}</label><b className="g">{isRTL ? sc.amtAr : sc.amt}</b></div><div className="hx-cell"><label>{T('VAT 14%','ضريبة ١٤٪')}</label><b>{isRTL ? sc.vatAr : sc.vat}</b></div><div className="hx-cell"><label>{T('Project safe','خزينة المشروع')}</label><b style={{fontSize:13}}>{isRTL?sc.pAr:sc.pEn}</b></div><div className="hx-cell"><label>{T('Posting','الترحيل')}</label><b style={{fontSize:13}}>{T('Safe + VAT ledger + trail','خزينة + ضرائب + سجل')}</b></div></div></>
                :<div style={{textAlign:'center',padding:10}}><div style={{width:52,height:52,borderRadius:'50%',background:'rgba(34,197,94,.12)',color:'#22c55e',border:'1px solid rgba(34,197,94,.4)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}><CheckCircle2 size={24}/></div><b>{T('Posted to safe & ledger','تم الترحيل للخزينة والدفتر')}</b><p className="hx-p" style={{textAlign:'center'}}>{isRTL ? sc.amtAr : sc.amt} → {isRTL?sc.pAr:sc.pEn} · {T('VAT ledger updated, audit entry sealed.','دفتر الضرائب تحدّث، وقيد التدقيق اتقفل.')}</p></div>}</div></>)}
              {tab==='safes'&&(<div style={{gridColumn:'1/-1'}}><h3 className="hx-h3" style={{textAlign:'center'}}>{T('Site money stays on site. Office money stays in the office.','فلوس الموقع في الموقع. وفلوس المكتب في المكتب.')}</h3><p className="hx-p" style={{textAlign:'center',maxWidth:620,marginInline:'auto'}}>{T('Every project has its own safe — materials, subcontractors, daily labor. The office earns only its supervision cut, moved automatically the second a site expense is approved. The owner sees true site cost and true office profit side by side — with total clarity and zero ambiguity.','كل مشروع ليه خزينته — مواد ومقاولين ويومية. المكتب بيحصّل بس نسبة الإشراف، بتتحوّل أوتوماتيك لحظة اعتماد مصروف الموقع. صاحب الشركة بيشوف تكلفة الموقع الحقيقية وربح المكتب الحقيقي جنب لجنب، بمنتهى الوضوح والشفافية ومن غير أي لبس.')}</p><div className="hx-kpis"><div className="hx-kpi"><label>{T('Project safe · Al-Amal','خزينة المشروع · الأمل')}</label><b>{T('2,450,000 EGP','2,450,000 ج.م')}</b><span>{T('Materials, contractors, day labor — fenced per project','مواد ومقاولون ويوميات — مسيّجة لكل مشروع')}</span><div className="hx-meter"><i style={{'--w':'68%'}}/></div><span style={{marginTop:6,display:'block'}}>{T('68% committed · 32% free','68% مرتبط · 32% حر')}</span></div><div className="hx-kpi"><label>{T('Office safe · supervision earned','خزينة المكتب · إشراف محصّل')}</label><b style={{color:'#22c55e'}}>{T('367,500 EGP','367,500 ج.م')}</b><span>{T('15% fee auto-moved on every approval','نسبة 15% بتتحوّل تلقائيًا مع كل اعتماد')}</span><div className="hx-meter"><i style={{'--w':'34%'}}/></div><span style={{marginTop:6,display:'block'}}>{T('Last move +3,675 EGP · just now','آخر تحويل +3,675 جنيه · دلوقتي')}</span></div></div></div>)}
              {tab==='dsr'&&(<><div><h3 className="hx-h3">{T('A site diary worth signing.','يومية موقع تستاهل التوقيع.')}</h3><p className="hx-p">{T('Two minutes, one hand: weather auto-fills, attendance is headcounts not name lists, deliveries and pours are quantities, and the consultant e-signs on the spot. Late reports chase themselves — the ledger locks the same day, not end-of-month.','دقيقتين، إيد واحدة: الطقس بيتملا لوحده، الحضور أعداد مش أسامي، التوريدات والصبّات كميات، والاستشاري بيوقّع إلكتروني في الموقع. التقارير المتأخرة بتطارد نفسها — الدفتر بيتقفل نفس اليوم، مش آخر الشهر.')}</p><p className="hx-p" style={{fontSize:12.5}}>{T('Every report locks to its project ledger the same day — no end-of-month reconstruction.','كل تقرير بيتقفل على دفتر مشروعه نفس اليوم — مفيش إعادة بناء آخر الشهر.')}</p></div><div className="hx-card"><div className="hx-card-top"><span>DSR #142 · {T('Al-Narges Tower','برج النرجس')}</span><span className="hx-conf">{T('Approved','معتمد')}</span></div><div className="hx-kv" style={{gridTemplateColumns:'1fr 1fr 1fr'}}><div className="hx-cell"><label>{T('Labor present','الحضور')}</label><b>34</b></div><div className="hx-cell"><label>{T('Weather','الطقس')}</label><b>31°C</b></div><div className="hx-cell"><label>{T('Pour','الصب')}</label><b>60 m³</b></div></div><div className="hx-note"><strong>{T('Engineer: ','المهندس: ')}</strong>{T('3rd-floor columns poured, curing started, consultant punch list attached.','تم صب أعمدة الدور الثالث وبدء المعالجة، وقائمة ملاحظات الاستشاري مرفقة.')}</div><div className="hx-note" style={{marginBottom:0}}><strong>{T('Signed: ','التوقيع: ')}</strong>{T('Site consultant · 4:40 PM, same day','استشاري الموقع · 4:40 مساءً نفس اليوم')}</div></div></>)}
              {tab==='recon'&&(<><div><h3 className="hx-h3">{T('Upload the CSV. It matches itself.','ارفع الـ CSV. هيطابق نفسه.')}</h3><p className="hx-p">{T('Drop your statement from NBE, CIB, QNB or Banque Misr. Hesaby pairs every line with its ledger entry — client payments against invoices, supplier checks against purchase orders — and surfaces only the real differences. What used to steal a full day now takes seconds.','نزّل كشف حسابك من الأهلي أو CIB أو QNB أو بنك مصر. حسابي بيزاوج كل سطر بقيده — تحصيلات العملاء مع الفواتير، شيكات الموردين مع أوامر الشراء — وبيطلّع الفروق الحقيقية بس. اللي كان بياخد من المحاسب يوم كامل بياخد ثواني.')}</p></div><div className="hx-card"><div className="hx-card-top"><span>NBE · {T('Contracting account','حساب المقاولات')}</span><span className="hx-conf">100%</span></div><div className="hx-rows"><div className="hx-rowline"><span>{T('Client inflow · Al-Amal invoice #12','تحصيل عميل · فاتورة الأمل #12')}</span><b style={{color:'#22c55e'}}>+450,000</b></div><div className="hx-rowline"><span>{T('Ezz Steel check · matched to PO-44','شيك عز · مطابق لأمر شراء 44')}</span><b style={{color:'#ef4444'}}>-185,000</b></div><div className="hx-rowline"><span>{T('Cement Lafarge · pending approval','أسمنت لافارج · بانتظار الاعتماد')}</span><b style={{color:'var(--accent)'}}>-42,600</b></div><div className="hx-meter"><i style={{'--w':'100%'}}/></div><p className="hx-p" style={{fontSize:12,margin:'10px 0 0'}}>{T('2 matched · 1 awaiting approval · 0 unexplained differences.','سطران مطابقان · سطر بانتظار الاعتماد · صفر فروق غير مفسرة.')}</p></div></div></>)}
              {tab==='approval'&&(<div style={{gridColumn:'1/-1',textAlign:'center'}}><h3 className="hx-h3">{T('Spending limits that enforce themselves.','حدود صرف بتفرض نفسها.')}</h3><p className="hx-p" style={{textAlign:'center',maxWidth:560,marginInline:'auto'}}>{T('Site engineers approve up to 5,000 EGP from custody. Project managers up to 50,000. Anything above routes to the general manager with the full receipt, report and balance attached. Drag the slider — see where every amount lands.','مهندس الموقع بيعتمد لحد ٥,٠٠٠ جنيه من العهدة. مدير المشروع لحد ٥٠,٠٠٠. أي حاجة فوق كده بتروح للمدير العام ومعاها الفاتورة والتقرير والرصيد. حرّك المؤشر — شوف كل مبلغ بيروح فين.')}</p><p className="hx-p" style={{textAlign:'center'}}><b style={{fontSize:24,color:'var(--text)'}}>{currency(amt)}</b></p><input type="range" min={1000} max={150000} step={1000} value={amt} onChange={(e)=>setAmt(Number(e.target.value))} style={{width:'min(440px,100%)',accentColor:'var(--accent)'}}/><div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12,flexWrap:'wrap',fontSize:12,color:'var(--muted)'}}><span>≤ 5k · {T('Engineer','مهندس')}</span><span>·</span><span>≤ 50k · {T('Manager','مدير')}</span><span>·</span><span>&gt; 50k · {T('Executive','إدارة')}</span></div><div style={{fontSize:20,fontWeight:800,color:appr.c,marginTop:10}}>{appr.r}</div></div>)}
            </div>
          </div>
        </div>
      </div>

      <section id="modules" className="hx-inner hx-sec">
        <div className="hx-head rv"><div className="hx-eyebrow">{T('Modules','الموديولات')}</div><h2 className="hx-h2">{T('Five tools, one set of numbers.','خمس أدوات، رقم واحد.')}</h2><p className="hx-lead">{T('Receipt, safe, report, payroll, stock — they all read and write the same balances. A receipt scanned at noon becomes a safe movement, a payroll line and a tax entry by evening, and the numbers always agree.','فاتورة، خزينة، تقرير، أجور، مخزون — كلهم بيقرأوا ويكتبوا في نفس الأرصدة. الفاتورة اللي اتمسحت الضهر بتبقى حركة خزينة وبند أجور وقيد ضريبي بالليل، والأرقام دايمًا متطابقة.')}</p></div>
        <div className="hx-grid6">
          {[{c:'c3',tag:T('Receipt OCR','مسح الفواتير'),t:T('Invoices that type themselves','فواتير بتسجّل نفسها'),d:T('Arabic and English invoices scanned in seconds — vendor, tax ID, line items, 14% VAT — then posted to the right safe with a sealed audit trail. No data entry team, no Friday scramble.','فواتير عربي وإنجليزي بتتمسح في ثواني — المورّد والرقم الضريبي والبنود وضريبة ١٤٪ — وبتترحّل للخزينة الصح بسجل تدقيق مقفول. من غير فريق إدخال ولا لخبطة الجمعة.'),v:[[T('Ezz Steel · Al-Amal','حديد عز · برج الأمل'),T('185,000','185,000')],[T('VAT 14% · posted','ضريبة ١٤٪ · مرحّلة'),T('25,900','25,900')],[T('Audit trail','سجل التدقيق'),T('Sealed','معتمد ومقفل')]]},
            {c:'c3',tag:T('Safes & custody','الخزائن والعهد'),t:T('Balances you\'d bet your margin on','أرصدة تراهن عليها بهامشك'),d:T('Project safes fenced per site, engineer custody capped by role, office supervision fees moved on approval. The owner sees site cost and office profit separately — live, not month-end.','خزائن مشاريع مسيّجة لكل موقع، عهد مهندسين مسقوفة بالدور، نسبة الإشراف بتتحوّل مع الاعتماد. صاحب الشركة بيشوف تكلفة الموقع وربح المكتب منفصلين — لحظي، مش آخر الشهر.'),v:[[T('Available across sites','المتاح بالمشاريع'),T('2,480,500','2,480,500')],[T('Office earned · 15%','أرباح المكتب · ١٥٪'),T('367,500','367,500')],[T('Last auto-move','آخر تحويل تلقائي'),T('+3,675','+3,675')]]},
            {c:'c2',tag:'DSR',t:T('Site diary in two minutes flat','يومية الموقع في دقيقتين بالظبط'),d:T('Weather, headcounts, deliveries, pours and consultant e-sign — filed one-handed from the scaffold and locked to the project ledger same day.','الطقس والأعداد والتوريدات والصب وتوقيع الاستشاري — بتتقدّم بإيد واحدة من السقالة وبتتقفل على دفتر المشروع نفس اليوم.'),v:[[T('Labor present','حضور العمالة'),T('34','34')],[T('Concrete poured','صب الخرسانة'),T('60 m³','60 م³')],[T('Consultant','الاستشاري'),T('Signed 4:40 PM','معتمد 4:40 م')]]},
            {c:'c2',tag:T('Payroll & draws','الأجور والمستخلصات'),t:T('Wages settled, zero disputes','أجور متصفية ومقفولة بلا خلافات'),d:T('Craft rates, day counts, advances and deductions computed once per cycle, then sealed into contractor draws anyone can audit. Clear numbers, zero ambiguity.','فئات الحرف وأيام التشغيل والسلف والخصومات بتتحسب مرة واحدة كل دورة، وبتتقفل في مستخلصات واضحة ومعتمدة يقدر الكل يراجعها بكل شفافية.'),v:[[T('Rebar draw #4','مستخلص حدادة #4'),T('45,000','45,000')],[T('Advances deducted','خصم السلف'),T('9,200','9,200')],[T('Status','الحالة'),T('Locked','معتمد ومقفل')]]},
            {c:'c2',tag:T('Inventory','المخازن'),t:T('Stock tracked to the last ton','المخزون متتبّع لآخر طن'),d:T('Cement and rebar deliveries matched against actual pour consumption per work item, with safety thresholds per site — waste shows up as a number, not a rumor.','توريدات الأسمنت والحديد بتتطابق مع المنصرف الفعلي لكل بند شغل، بحدود أمان لكل موقع — الهدر بيبان رقم، مش كلام.'),v:[[T('Rebar 16mm on hand','حديد 16مم بالموقع'),T('18.5t','18.5 طن')],[T('Site safety level','حد الأمان بالموقع'),T('5.0t','5.0 طن')],[T('This week used','المنصرف أسبوعيًا'),T('6.2t','6.2 طن')]]}].map((m,i)=>(
            <div key={i} className={cn('hx-b rv',m.c)} style={{'--rv-d':`${(i*0.08).toFixed(2)}s`}}><div className="hx-viz"><div className="hx-vizcard">{m.v.map(([k,v],vi)=><div key={vi} className="hx-vr"><span>{k}</span><b>{v}</b></div>)}<div className="hx-meter"><i style={{'--w':`${55+i*9}%`}}/></div></div></div>
            <div className="hx-btxt"><span className="hx-tagline">{m.tag}</span><h4>{m.t}</h4><p>{m.d}</p></div></div>))}
        </div>
      </section>

      <section id="why" className="hx-inner hx-sec">
        <div className="hx-head rv"><div className="hx-eyebrow">{T('The real cost','التكلفة الحقيقية')}</div><h2 className="hx-h2">{T('You\'re bleeding money between the scaffold and the desk.','فلوسك بتنزف بين السقالة والمكتب.')}</h2><p className="hx-lead">{T('Four leaks that drain contractor profit every single week — and what Hesaby plugs in their place.','أربع ثقوب بتسرّب ربح المقاول كل أسبوع — وإيه اللي حسابي بيسدّه مكانها.')}</p></div>
        <div className="rv" style={{ paddingBlock: '100px 110px' }}><DisplayCards cards={[{ icon: <Receipt size={15} />, title: T('The receipt vanishes in site pockets','الفاتورة بتضيع في جيوب الموقع'), description: T('Paper invoices crumple, fade and vanish in dusty site pockets before Friday settlement. Snap it on the scaffold — it posts with vendor, tax ID and VAT before you reach the ground floor.','الفواتير الورق بتتكرمش وبتبهت وبتضيع في جيوب الموقع المتربة قبل تصفية الجمعة. صوّرها على السقالة — هتتسجّل بالمورّد والرقم الضريبي والضريبة قبل ما توصل الدور الأرضي.'), tag: T('Every Friday','كل جمعة'), className: '[grid-area:stack] -skew-y-[8deg] transition-all duration-500 max-sm:[grid-area:auto] max-sm:skew-y-0 max-sm:translate-x-0 max-sm:translate-y-0 translate-x-0 translate-y-0 hover:-translate-y-10 hover:scale-[1.02] group-hover/dc:opacity-60 hover:!opacity-100 max-sm:hover:translate-y-0 max-sm:hover:scale-100 dim' }, { icon: <FileSpreadsheet size={15} />, title: T('Three versions of the truth','تلات نسخ للحقيقة'), description: T('The site runs version 3, the office runs version 5, and the bank matches neither. One live ledger both sides read — safe balances update the second spend is approved.','الموقع شغّال على نسخة ٣، المكتب على نسخة ٥، والبنك مش مطابق لأي واحدة فيهم. دفتر واحد حي الطرفين بيقرأوه — أرصدة الخزائن بتتحدّث لحظة اعتماد الصرف.'), tag: T('v3 vs v5','نسخة ضد نسخة'), className: '[grid-area:stack] -skew-y-[8deg] transition-all duration-500 max-sm:[grid-area:auto] max-sm:skew-y-0 max-sm:translate-x-0 max-sm:translate-y-0 translate-x-20 translate-y-6 hover:-translate-y-16 hover:scale-[1.02] group-hover/dc:opacity-60 hover:!opacity-100 max-sm:hover:translate-y-0 max-sm:hover:scale-100 dim' }, { icon: <ShieldCheck size={15} />, title: T('“Who approved this?” on WhatsApp','"مين اعتمد ده؟" على واتساب'), description: T('A 150,000 EGP delivery nobody has record of authorizing. Role thresholds with a timestamped trail — engineer, manager, executive — no approvals lost in chat threads.','توريدة بـ ١٥٠ ألف جنيه محدش مسجّل مين اللي اعتمدها. مسار صلاحيات بسجل موقّت ومختوم — مهندس، مدير، إدارة — من غير اعتمادات تايهة في رسائل واتساب.'), tag: T('150,000 EGP','150 ألف جنيه'), className: '[grid-area:stack] -skew-y-[8deg] transition-all duration-500 max-sm:[grid-area:auto] max-sm:skew-y-0 max-sm:translate-x-0 max-sm:translate-y-0 translate-x-40 translate-y-12 hover:-translate-y-24 hover:scale-[1.02] group-hover/dc:opacity-60 hover:!opacity-100 max-sm:hover:translate-y-0 max-sm:hover:scale-100 dim' }, { icon: <TrendingUp size={15} />, title: T('Margin shock at handover','صدمة الهامش عند التسليم'), description: T('You find out the 10% margin shrank to 4% six months too late. Supervision fees move to office revenue on every approval — net margin is visible every single day.','بتكتشف إن هامش الـ ١٠٪ بقى ٤٪ بعد ما فات الأوان بستة شهور. نسبة الإشراف بتتحوّل لإيراد المكتب مع كل اعتماد — الصافي باين كل يوم.'), tag: T('10% → 4%','10% ← 4%'), className: '[grid-area:stack] -skew-y-[8deg] transition-all duration-500 max-sm:[grid-area:auto] max-sm:skew-y-0 max-sm:translate-x-0 max-sm:translate-y-0 translate-x-60 translate-y-18 hover:-translate-y-6 hover:scale-[1.02] group-hover/dc:opacity-60 hover:!opacity-100 max-sm:hover:translate-y-0 max-sm:hover:scale-100' }]} /></div>
      </section>

      <section className="hx-inner hx-sec"><div className="hx-split rv">
        <div><div className="hx-eyebrow">{T('Built for the field','مبني للموقع')}</div><h2 className="hx-h2" style={{marginTop:12}}>{T('Made for sun, dust and tough job sites.','مصمم للشمس والتراب وظروف الموقع الصعبة.')}</h2><p className="hx-lead">{T('The full ledger lives in the engineer\'s pocket: high-contrast field mode you can read under direct sun, one-hand voice and photo capture, live custody balance before you spend a pound, and an offline queue that syncs the moment signal comes back. The office sees everything — without a single phone call.','الدفتر كله في جيب المهندس: وضع ميداني عالي التباين تقرأه تحت الشمس المباشرة، تصوير وتسجيل صوتي بإيد واحدة، رصيد العهدة باين قبل ما تصرف جنيه، وقائمة أوفلاين بتتزامن لحظة الإشارة ما ترجع. المكتب بيشوف كل حاجة — من غير مكالمة واحدة.')}</p>
        <div style={{display:'flex',gap:10,marginTop:20,flexWrap:'wrap'}}><span className="hx-pill"><Smartphone size={13}/> iOS & Android · {T('one-hand capture','التقاط بإيد واحدة')}</span><span className="hx-pill"><Zap size={13}/> {T('Offline queue · auto-sync','قائمة أوفلاين · مزامنة تلقائية')}</span></div></div>
        <div><div className="hx-phone"><div className="hx-screen"><div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><b style={{fontSize:13}}>Hesaby Field · {T('Al-Amal','الأمل')}</b><span className="hx-conf">{T('Online','متصل')}</span></div><div className="hx-cell" style={{marginBottom:10}}><label>{T('My custody left','المتبقي من عهدتي')}</label><b>{T('86,400 EGP','86,400 ج.م')}</b></div><div className="hx-cell" style={{marginBottom:10}}><label>{T('Project safe','خزينة المشروع')}</label><b>{T('2,450,000 EGP','2,450,000 ج.م')}</b></div><div className="hx-rows"><div className="hx-rowline"><span>{T('Ready-mix · today 11:20','خرسانة جاهزة · اليوم 11:20')}</span><b style={{color:'#ef4444'}}>-24,500</b></div><div className="hx-rowline"><span>{T('Rebar batch #12 · yesterday','حديد دفعة 12 · أمس')}</span><b style={{color:'#ef4444'}}>-85,000</b></div></div></div></div></div>
      </div></section>

      <section id="pricing" className="hx-inner hx-sec">
        <div className="hx-head rv"><div className="hx-eyebrow">{T('Pricing','الأسعار')}</div><h2 className="hx-h2">{T('Free to prove it. Pay when you scale.','مجاني يثبت نفسه. ادفع لما تكبر.')}</h2><p className="hx-lead">{T('Run your first project free — no time limit, no credit card. Upgrade when you add more sites, more seats or more AI volume. Annual billing saves 20%.','شغّل أول مشروع مجاني — من غير مدة ومن غير كارت. انقل للمدفوع لما تضيف مواقع أو مستخدمين أو عمليات AI أكتر. الاشتراك السنوي بيوفّر ٢٠٪.')}</p>
        <div className="hx-bill"><button onClick={()=>setCycle('monthly')} className={cn(cycle==='monthly'&&'on')}>{T('Monthly','شهري')}</button><button onClick={()=>setCycle('annual')} className={cn(cycle==='annual'&&'on')}>{T('Annual −20%','سنوي −٢٠٪')}</button></div></div>
        <div className="hx-plans">{plans.map(p=>{const ent=p.price==null;const price=!ent?((cycle==='annual')?Math.round(p.price*12*.8):p.price):null;const feats=(isRTL?p.fAr:p.f)||[];return(
          <div key={p.key} className={cn('hx-plan rv',p.pop&&'pop')} style={{'--rv-d':`${(({FREE:0,PREMIUM:.08,BUSINESS:.16,ENTERPRISE:.24})[p.key] ?? 0).toFixed(2)}s`}}><h3>{isRTL?p.nAr:p.n}{p.pop&&<span className="hx-pop">{T('POPULAR','الأكثر')}</span>}</h3><p className="hx-pdesc">{isRTL?p.dAr:p.d}</p>
          <div>{ent?<span className="hx-price" style={{fontSize:22}}>{T('Custom','مخصص')}</span>:p.price===0?<span className="hx-price" style={{fontSize:22}}>{T('Free','مجاني')}</span>:<><span className="hx-price">{currency(price)}</span> <span className="hx-per">/ {cycle==='annual'?T('yr','سنة'):T('mo','شهر')}</span></>}</div>
          <ul className="hx-feats">{feats.slice(0,5).map(f=><li key={f}><Check size={14}/>{f}</li>)}</ul>
          <Link to={user?'/billing':'/signup'} className={cn('hx-btn',p.pop?'hx-btn-fire':'hx-btn-ghost')} style={{width:'100%'}}>{ent?T('Talk to us','كلمنا'):p.price===0?T('Start free','ابدأ مجانًا'):T('Choose plan','اختر الباقة')}</Link></div>);})}</div>
      </section>

      <section className="hx-inner hx-sec"><LampContainer className="rv min-h-[560px] rounded-[26px] border border-[var(--line2)] lamp-tight">
        <motion.div
          initial={{ opacity: 0.5, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="flex flex-col items-center text-center lamp-ink"
        >
          <div style={{display:'flex',justifyContent:'center',marginBottom:18}}><span className="hx-logo-chip" style={{width:52,height:52,borderRadius:14}}><img src="/hesaby_logo_icon.svg" alt="Hesaby" style={{width:40,height:40}} /></span></div>
          <h2 className="hx-h2" style={{color:'#f5f4f0'}}>{T('Your next project deserves clean books from day one.','مشروعك الجاي يستاهل دفاتر نضيفة من أول يوم.')}</h2>
          <p className="hx-lead" style={{maxWidth:600,marginInline:'auto',color:'#a8a29e'}}>{T('Bring one live project this week — its receipts, its reports, its custody and its bank lines. By Friday you\'ll know the true cost, the safe balance and your earned fee, down to the last pound.','أحضر مشروع واحد حي الأسبوع ده — فواتيره وتقاريره وعهدته وكشف حسابه. وبحلول الجمعة هتعرف التكلفة الحقيقية ورصيد الخزينة وأتعابك المستحقة، لآخر جنيه.')}</p>
          <div className="hx-ctas"><Link to={user?'/dashboard':'/signup'} className="hx-btn hx-btn-fire" style={{padding:'15px 34px',fontSize:15}}>{T('Start free — no card needed','ابدأ مجانًا — من غير كارت')}</Link></div>
          <p className="hx-micro2">{T('No credit card required · Instant setup · Zero commitment','بدون بطاقة بنكية · تشغيل فوري · بدون أي التزام')}</p>
        </motion.div>
      </LampContainer></section>
      <footer className="hx-footer"><div className="hx-inner hx-foot"><span style={{display:'inline-flex',alignItems:'center',gap:10}}><span className="hx-logo-chip" style={{width:28,height:28,borderRadius:8}}><img src="/hesaby_logo_icon.svg" alt="Hesaby" style={{width:20,height:20}} /></span><b style={{color:'var(--text)'}}>Hesaby</b> — {T('Your site, properly recorded.','موقعك، مسجّل صح.')}</span><span>© {new Date().getFullYear()} · EN / عربي</span></div></footer>
      {isMobile && (<div className="tube-dock"><TubeNav id="tube-dock" items={navItems} active={active} onSelect={pick} /></div>)}
    </div>
    </MotionConfig>
  );
}
