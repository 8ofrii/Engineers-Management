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
  { id:'ezz', tAr:'فاتورة حديد عز', tEn:'Ezz Steel', vAr:'حديد عز', vEn:'Ezz Steel', pAr:'برج الأمل', pEn:'Al-Amal Tower', amt:'185,000 EGP', vat:'25,900 EGP', itemsAr:'4 طن حديد 16مم و12مم', itemsEn:'4t rebar 16/12mm', conf:'99.8%' },
  { id:'laf', tAr:'فاتورة لافارج', tEn:'Lafarge', vAr:'لافارج مصر', vEn:'Lafarge Egypt', pAr:'فيلا التجمع', pEn:'New Cairo Villa', amt:'42,600 EGP', vat:'5,964 EGP', itemsAr:'15 طن أسمنت', itemsEn:'15t cement', conf:'99.4%' },
  { id:'fuel', tAr:'إيصال وقود', tEn:'Fuel receipt', vAr:'وطنية', vEn:'Watanya', pAr:'العاصمة الإدارية', pEn:'New Capital', amt:'8,500 EGP', vat:'1,190 EGP', itemsAr:'سولار للحفار والمولد', itemsEn:'Diesel — excavator', conf:'99.1%' },
];
const PLANS = [
  { key:'FREE', n:'Free Plan', nAr:'الباقة المجانية', d:'Ideal for site engineers & pilot testing on initial construction sites.', dAr:'مثالية لمهندسي المواقع وتجربة النظام على المشاريع الأولى.', price:0, f:['Up to 2 Active Projects','2 Dedicated Team Seats','150 AI Extractions / month','Daily Site Reports (DSR)','Site Custody & Mobile App'], fAr:['مشروعين هندسيين نشطين','عضوين بصلاحيات محددة','150 عملية ذكاء اصطناعي شهرياً','تقارير الموقع اليومية (DSR)','إدارة العهدة وتطبيق الموبايل'] },
  { key:'PREMIUM', n:'Premium Plan', nAr:'الباقة المميزة (Premium)', d:'For active contractors and teams requiring real-time site control.', dAr:'لشركات المقاولات وفرق المواقع ذات العمليات المتواصلة.', price:2450, pop:true, f:['Up to 10 Active Projects','15 Multi-Role Team Seats','2,500 AI OCR & Actions / mo','Multi-Tier Financial Approvals','Workforce Wages & Inventory'], fAr:['10 مشاريع هندسية نشطة','15 مستخدم بصلاحيات متقدمة','2,500 عملية ذكاء اصطناعي شهرياً','دورة اعتمادات الصرف متعددة المستويات','سجل أجور العمالة والمخازن'] },
  { key:'BUSINESS', n:'Business Plan', nAr:'باقة الأعمال (Business)', d:'For mid-sized contractors and developers running multi-site operations.', dAr:'لشركات المقاولات والتطوير العقاري وإدارة عدة مواقع متزامنة.', price:4450, f:['Up to 30 Active Projects','40 Team Seats & Roles','6,000 AI Agent Actions / mo','Multi-Site Safes & Egyptian VAT','Cost Variance & Audit Logging'], fAr:['30 مشروعاً وموقعاً متزامناً','40 مستخدماً مع سجل الصلاحيات','6,000 عملية ذكاء اصطناعي شهرياً','خزائن المواقع وفواتير ضريبة 14%','تحليل انحراف التكاليف وسجل التدقيق'] },
  { key:'ENTERPRISE', n:'Enterprise Plan', nAr:'باقة الشركات (Enterprise)', d:'Dedicated infrastructure, custom SLAs, and unlimited capacity.', dAr:'بنية تحتية مخصصة، واتفاقية مستوى خدمة، وسعة غير محدودة.', price:null, f:['Unlimited Projects & Subcontracts','Unlimited Seats & Custom RBAC','Dedicated Isolated Database','15,000+ AI Extractions & SLA','Custom ERP API & 24/7 Support'], fAr:['مشاريع ومواقع وعقود غير محدودة','مستخدمين غير محدودين وصلاحيات مخصصة','قاعدة بيانات مخصصة ومعزولة','15,000+ عملية AI وضمان 99.9%','ربط أنظمة ERP ودعم فني مخصص 24/7'] },
];

export default function Landing() {
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { currency } = useFormat();
  const [plans] = useState(PLANS);
  const [cycle, setCycle] = useState('monthly');
  const [tab, setTab] = useState('ocr');
  const [theme, setTheme] = useState(() => (localStorage.getItem('theme_preset') === 'light' ? 'light' : 'dark'));
  const light = theme === 'light';
  const [amt, setAmt] = useState(25000);
  const [sel, setSel] = useState(0);
  const [posted, setPosted] = useState(false);
  const isRTL = i18n.language === 'ar';
  const T = (en, ar) => (isRTL ? ar : en);
  useEffect(() => { document.body.classList.toggle('light-mode', light); localStorage.setItem('theme_preset', theme); }, [theme, light]);
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
    { key: 'why', label: T('Why', 'لماذا') },
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
          <h1 className="hx-h1"><span>{T('Say it. Snap it.','قولها. صوّرها.')}</span><span>{T('It’s already logged.','واتسجّلت خلاص.')}</span><span className="hx-hw"><HandwritingText text={T('Never lose a record.','ولا قيد يضيع.')} arabic={isRTL} replayKey={`${i18n.language}-${theme}`} /></span></h1>
          <p className="hx-sub">{T('Hesaby is the site-to-office ledger for Egyptian contractors: speak in Egyptian Arabic or snap a receipt photo, and the expense posts to the right project safe with the 14% VAT split handled. Daily reports, custody wallets, approvals and bank matching run on the same ledger — so Friday payroll stops being a hunt through pockets, WhatsApp threads and duplicate sheets.','حسابي هو دفتر الموقع والمكتب لشركات المقاولات في مصر: اتكلم بالمصري أو صوّر فاتورة، والمصروف يتسجّل في خزينة المشروع الصحيحة مع فصل ضريبة ١٤٪. التقارير اليومية والعهد والاعتمادات والمطابقة البنكية كلها على نفس الدفتر — فتصفية الجمعة تبطّل تكون مطاردة بين الجيوب وواتساب والشيتات المكررة.')}</p>
          <div className="hx-ctas"><Link to={user?'/dashboard':'/signup'} className="hx-btn hx-btn-fire">{T('Start free','ابدأ مجانًا')}</Link><a href="#preview" onClick={(e)=>go(e,'preview')} className="hx-btn hx-btn-ghost"><Play size={14}/>{T('See live demo','شاهد تجربة حيّة')}</a></div>
          <div className="hx-micro">{T('Free for 1 project · Arabic voice first · Works on site offline','مجاني لمشروع واحد · الصوت العربي أولًا · شغّال في الموقع دون إنترنت')}</div>
        </div>

        <div className="hx-inner hx-frame-wrap" id="preview">
          <div className="hx-head rv"><div className="hx-eyebrow">{T('Live demo','تجربة حيّة')}</div><h2 className="hx-h2">{T('One ledger, five daily flows.','دفتر واحد، خمسة تدفقات يومية.')}</h2><p className="hx-lead">{T('This is the real product logic, not screenshots: scan a receipt, watch safes split, file a site report, match the bank, test who approves what. Click through the tabs.','هذا منطق المنتج الحقيقي وليس صورًا ثابتة: امسح فاتورة، وشاهد انقسام الخزائن، وسجّل تقرير موقع، وطابق البنك، وجرّب من يعتمد ماذا. تنقّل بين التبويبات.')}</p></div>
          <div className="hx-tabs rv" style={{'--rv-d':'.12s'}}>{tabs.map(t=><button key={t.k} onClick={()=>setTab(t.k)} className={cn('hx-tab',tab===t.k&&'on')}><t.i size={14}/>{t.l}</button>)}</div>
          <div ref={frameRef} onPointerMove={onTilt} onPointerLeave={offTilt} className="hx-frame tilt rv" style={{'--rv-d':'.2s'}}>
            <div className="hx-fbar"><span className="hx-dots"><i/><i/><i/></span><span className="hx-furl">hesaby.ai/app/{tab}</span><span className="hx-live"><span className="hx-pulse"/>{T('LIVE','مباشر')}</span></div>
            <div className="hx-fbody" key={tab}>
              {tab==='ocr'&&(<><div><h3 className="hx-h3">{T('Snap it. Structured instantly.','صوّرها. وتتبوّب فورًا.')}</h3><p className="hx-p">{T('The AI reads Arabic and English invoices — vendor name, tax ID, dates, line items and the 14% VAT breakdown — with zero typing. Pick a real site scenario, then approve: the amount leaves the project safe, the VAT posts to the tax ledger, and the audit trail writes itself.','الذكاء الاصطناعي يقرأ الفواتير العربية والإنجليزية — اسم المورّد والرقم الضريبي والتواريخ والبنود وتفصيل ضريبة ١٤٪ — دون كتابة. اختر سيناريو حقيقيًا من الموقع، ثم اعتمد: المبلغ يخرج من خزينة المشروع، والضريبة تُرحّل لدفتر الضرائب، وسجل التدقيق يُكتب وحده.')}</p>
                <div className="hx-pick">{SCEN.map((s,i)=><button key={s.id} onClick={()=>{setSel(i);setPosted(false);}} className={cn(i===sel&&'on')}>{isRTL?s.tAr:s.tEn}</button>)}</div>
                {!posted?<button className="hx-btn hx-btn-fire" onClick={()=>setPosted(true)}><Camera size={15}/>{T('Approve & post','اعتماد وترحيل')}</button>:<button className="hx-btn hx-btn-ghost" onClick={()=>setPosted(false)}>{T('Try another','جرّب أخرى')}</button>}<p className="hx-p" style={{fontSize:12.5,marginTop:12,marginBottom:0}}>{T('Confidence shown per scan. Low-confidence fields are flagged for review instead of posting silently.','تظهر نسبة الثقة مع كل مسح. الحقول منخفضة الثقة تُعلَّم للمراجعة بدل الترحيل بصمت.')}</p></div>
                <div className="hx-card"><div className="hx-card-top"><span>{isRTL?sc.vAr:sc.vEn} → {isRTL?sc.pAr:sc.pEn}</span><span className="hx-conf">{sc.conf}</span></div>
                {!posted?<><div className="hx-note"><strong>{T('Items: ','البنود: ')}</strong>{isRTL?sc.itemsAr:sc.itemsEn}</div><div className="hx-kv"><div className="hx-cell"><label>{T('Total','الإجمالي')}</label><b className="g">{sc.amt}</b></div><div className="hx-cell"><label>{T('VAT 14%','ضريبة ١٤٪')}</label><b>{sc.vat}</b></div><div className="hx-cell"><label>{T('Project safe','خزينة المشروع')}</label><b style={{fontSize:13}}>{isRTL?sc.pAr:sc.pEn}</b></div><div className="hx-cell"><label>{T('Posting','الترحيل')}</label><b style={{fontSize:13}}>{T('Safe + VAT ledger + trail','خزينة + ضرائب + سجل')}</b></div></div></>
                :<div style={{textAlign:'center',padding:10}}><div style={{width:52,height:52,borderRadius:'50%',background:'rgba(34,197,94,.12)',color:'#22c55e',border:'1px solid rgba(34,197,94,.4)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}><CheckCircle2 size={24}/></div><b>{T('Posted to safe & ledger','تم الترحيل للخزينة والدفتر')}</b><p className="hx-p" style={{textAlign:'center'}}>{sc.amt} → {isRTL?sc.pAr:sc.pEn} · {T('VAT ledger updated, audit entry sealed.','دفتر الضرائب تحدّث، وقيد التدقيق اتقفل.')}</p></div>}</div></>)}
              {tab==='safes'&&(<div style={{gridColumn:'1/-1'}}><h3 className="hx-h3" style={{textAlign:'center'}}>{T('Project money and office money never mix.','فلوس المشروع وفلوس المكتب لا يختلطان أبدًا.')}</h3><p className="hx-p" style={{textAlign:'center',maxWidth:620,marginInline:'auto'}}>{T('Each project holds its own safe for materials, contractors and labor. The office safe only earns its supervision fee — moved automatically the second site spend is approved, so the owner sees true site cost and true office profit side by side.','كل مشروع له خزينته الخاصة للمواد والمقاولين والعمالة. وخزينة المكتب لا تكسب إلا نسبة الإشراف — تتحوّل تلقائيًا لحظة اعتماد مصروف الموقع، فيرى المالك تكلفة الموقع الحقيقية وربح المكتب الحقيقي جنبًا إلى جنب.')}</p><div className="hx-kpis"><div className="hx-kpi"><label>{T('Project safe · Al-Amal','خزينة المشروع · الأمل')}</label><b>2,450,000 EGP</b><span>{T('Materials, contractors, day labor — fenced per project','مواد ومقاولون ويوميات — مسيّجة لكل مشروع')}</span><div className="hx-meter"><i style={{'--w':'68%'}}/></div><span style={{marginTop:6,display:'block'}}>{T('68% committed · 32% free','68% مرتبط · 32% حر')}</span></div><div className="hx-kpi"><label>{T('Office safe · supervision earned','خزينة المكتب · إشراف محصّل')}</label><b style={{color:'#22c55e'}}>367,500 EGP</b><span>{T('15% fee auto-moved on every approval','نسبة 15% تتحوّل تلقائيًا مع كل اعتماد')}</span><div className="hx-meter"><i style={{'--w':'34%'}}/></div><span style={{marginTop:6,display:'block'}}>{T('Last move +3,675 EGP · just now','آخر تحويل +3,675 جنيه · الآن')}</span></div></div></div>)}
              {tab==='dsr'&&(<><div><h3 className="hx-h3">{T('A site diary the consultant actually signs.','يومية موقع يوقّعها الاستشاري فعلًا.')}</h3><p className="hx-p">{T('The engineer files it in under two minutes with one hand: weather is prefilled, attendance is headcounts not names, deliveries and concrete pours are quantities, and the consultant e-signs on the spot. Late or missing reports chase themselves.','المهندس يقدّمها في أقل من دقيقتين بيد واحدة: الطقس مسجّل مسبقًا، والحضور أعداد لا أسماء، والتوريدات والصب كميات، والاستشاري يوقّع إلكترونيًا في الموقع. والتقارير المتأخرة أو الناقصة تطارد نفسها بنفسها.')}</p><p className="hx-p" style={{fontSize:12.5}}>{T('Every report locks to its project ledger the same day — no end-of-month reconstruction.','كل تقرير يُقفل على دفتر مشروعه في نفس اليوم — بلا إعادة بناء آخر الشهر.')}</p></div><div className="hx-card"><div className="hx-card-top"><span>DSR #142 · {T('Al-Narges Tower','برج النرجس')}</span><span className="hx-conf">{T('Approved','معتمد')}</span></div><div className="hx-kv" style={{gridTemplateColumns:'1fr 1fr 1fr'}}><div className="hx-cell"><label>{T('Labor present','الحضور')}</label><b>34</b></div><div className="hx-cell"><label>{T('Weather','الطقس')}</label><b>31°C</b></div><div className="hx-cell"><label>{T('Pour','الصب')}</label><b>60 m³</b></div></div><div className="hx-note"><strong>{T('Engineer: ','المهندس: ')}</strong>{T('3rd-floor columns poured, curing started, consultant punch list attached.','تم صب أعمدة الدور الثالث وبدء المعالجة، وقائمة ملاحظات الاستشاري مرفقة.')}</div><div className="hx-note" style={{marginBottom:0}}><strong>{T('Signed: ','التوقيع: ')}</strong>{T('Site consultant · 4:40 PM, same day','استشاري الموقع · 4:40 مساءً نفس اليوم')}</div></div></>)}
              {tab==='recon'&&(<><div><h3 className="hx-h3">{T('Bank statements that match themselves.','كشوف بنك تطابق نفسها.')}</h3><p className="hx-p">{T('Upload the CSV from NBE, CIB, QNB or Banque Misr. Hesaby pairs each line with its ledger entry — client inflows against invoices, vendor checks against purchase orders — and flags only the true differences with their amounts. What took an accountant days takes seconds.','ارفع ملف CSV من الأهلي أو CIB أو QNB أو بنك مصر. حسابي يزاوج كل سطر مع قيده — التحصيلات مع الفواتير، وشيكات الموردين مع أوامر الشراء — ويُظهر فقط الفروق الحقيقية بمبالغها. ما كان يستغرق من المحاسب أيامًا يستغرق ثوانٍ.')}</p></div><div className="hx-card"><div className="hx-card-top"><span>NBE · {T('Contracting account','حساب المقاولات')}</span><span className="hx-conf">100%</span></div><div className="hx-rows"><div className="hx-rowline"><span>{T('Client inflow · Al-Amal invoice #12','تحصيل عميل · فاتورة الأمل #12')}</span><b style={{color:'#22c55e'}}>+450,000</b></div><div className="hx-rowline"><span>{T('Ezz Steel check · matched to PO-44','شيك عز · مطابق لأمر شراء 44')}</span><b style={{color:'#ef4444'}}>-185,000</b></div><div className="hx-rowline"><span>{T('Cement Lafarge · pending approval','أسمنت لافارج · بانتظار الاعتماد')}</span><b style={{color:'var(--accent)'}}>-42,600</b></div><div className="hx-meter"><i style={{'--w':'100%'}}/></div><p className="hx-p" style={{fontSize:12,margin:'10px 0 0'}}>{T('2 matched · 1 awaiting approval · 0 unexplained differences.','سطرا ن مطابقان · سطر بانتظار الاعتماد · صفر فروق غير مفسرة.')}</p></div></div></>)}
              {tab==='approval'&&(<div style={{gridColumn:'1/-1',textAlign:'center'}}><h3 className="hx-h3">{T('Spending limits that enforce themselves.','حدود صرف تفرض نفسها.')}</h3><p className="hx-p" style={{textAlign:'center',maxWidth:560,marginInline:'auto'}}>{T('Site engineers approve up to 5,000 EGP from custody, project managers to 50,000, anything above routes to the general manager with the full receipt, report and balance attached. Drag the slider to see where an amount lands.','مهندس الموقع يعتمد حتى 5,000 جنيه من العهدة، ومدير المشروع حتى 50,000، وما فوق ذلك يتحوّل للمدير العام مرفقًا بالفاتورة والتقرير والرصيد. حرّك المؤشر لترى أين يقع أي مبلغ.')}</p><p className="hx-p" style={{textAlign:'center'}}><b style={{fontSize:24,color:'var(--text)'}}>{currency(amt)}</b></p><input type="range" min={1000} max={150000} step={1000} value={amt} onChange={(e)=>setAmt(Number(e.target.value))} style={{width:'min(440px,100%)',accentColor:'var(--accent)'}}/><div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12,flexWrap:'wrap',fontSize:12,color:'var(--muted)'}}><span>≤ 5k · {T('Engineer','مهندس')}</span><span>·</span><span>≤ 50k · {T('Manager','مدير')}</span><span>·</span><span>&gt; 50k · {T('Executive','إدارة')}</span></div><div style={{fontSize:20,fontWeight:800,color:appr.c,marginTop:10}}>{appr.r}</div></div>)}
            </div>
          </div>
        </div>
      </div>

      <section id="modules" className="hx-inner hx-sec">
        <div className="hx-head rv"><div className="hx-eyebrow">{T('Modules','الموديولات')}</div><h2 className="hx-h2">{T('Everything site + office, on one ledger.','كل شيء للموقع والمكتب على دفتر واحد.')}</h2><p className="hx-lead">{T('Five modules share the same balances, so a receipt scanned at noon is a safe movement, a payroll line and a tax entry by evening — with the numbers to prove it.','خمسة موديولات تتشارك نفس الأرصدة، فالفاتورة الممسوحة ظهرًا تصبح حركة خزينة وبند أجور وقيد ضريبي بحلول المساء — بالأرقام الدالة على ذلك.')}</p></div>
        <div className="hx-grid6">
          {[{c:'c3',tag:T('Receipt OCR','مسح الفواتير'),t:T('Receipts become ledger entries','الفواتير تصبح قيودًا'),d:T('Arabic and English invoices read in seconds — vendor, tax ID, line items, 14% VAT — then posted to the correct project safe with an audit trail. No typing pool, no Friday backlog.','فواتير عربية وإنجليزية تُقرأ في ثوانٍ — المورّد والرقم الضريبي والبنود وضريبة ١٤٪ — ثم تُرحّل لخزينة المشروع الصحيحة بسجل تدقيق. بلا إدخال يدوي ولا تراكم للجمعة.'),v:[['Ezz Steel · Al-Amal','185,000'],['VAT 14% · posted','25,900'],['Audit trail','Sealed']]},
            {c:'c3',tag:T('Safes & custody','الخزائن والعهد'),t:T('Balances you can trust at midnight','أرصدة تثق بها منتصف الليل'),d:T('Project safes fenced per site, engineer custody wallets capped by role, and office supervision fees moved automatically on approval. The owner sees site cost and office profit separately, live.','خزائن مشاريع مسيّجة لكل موقع، وعهد مهندسين مسقوفة بالدور، ونسب إشراف المكتب تتحوّل تلقائيًا عند الاعتماد. فيرى المالك تكلفة الموقع وربح المكتب منفصلين ولحظيًا.'),v:[['Available across sites','2,480,500'],['Office earned · 15%','367,500'],['Last auto-move','+3,675']]},
            {c:'c2',tag:'DSR',t:T('Site diary in 2 minutes','يومية الموقع في دقيقتين'),d:T('Weather, headcounts, deliveries, pours and consultant e-sign — filed one-handed from site and locked to the project ledger the same day.','الطقس والأعداد والتوريدات والصب وتوقيع الاستشاري — تُقدَّم بيد واحدة من الموقع وتُقفل على دفتر المشروع نفس اليوم.'),v:[['Labor present','34'],['Concrete poured','60 m³'],['Consultant','Signed 4:40 PM']]},
            {c:'c2',tag:T('Payroll & draws','الأجور والمستخلصات'),t:T('Wages without fights','أجور بلا مشاكل'),d:T('Craft rates, day counts, advances and deductions computed once per cycle, then locked into contractor draws everyone can audit.','فئات الحرف وأعداد الأيام والسلفيات والخصومات تُحسب مرة واحدة كل دورة، ثم تُقفل في مستخلصات يستطيع الجميع مراجعتها.'),v:[['Rebar draw #4','45,000'],['Advances deducted','9,200'],['Status','Locked']]},
            {c:'c2',tag:T('Inventory','المخازن'),t:T('Stock tied to pours','المخزون مربوط بالصب'),d:T('Cement and rebar deliveries matched against actual consumption per work item, with safety levels per site — waste and leakage show up as numbers, not rumors.','توريدات الأسمنت والحديد تُطابَق مع المنصرف الفعلي لكل بند، وبحدود أمان لكل موقع — فيظهر الهدر والتسرب أرقامًا لا شائعات.'),v:[['Rebar 16mm on hand','18.5t'],['Site safety level','5.0t'],['This week used','6.2t']]}].map((m,i)=>(
            <div key={i} className={cn('hx-b rv',m.c)} style={{'--rv-d':`${(i*0.08).toFixed(2)}s`}}><div className="hx-viz"><div className="hx-vizcard">{m.v.map(([k,v])=><div key={k} className="hx-vr"><span>{k}</span><b>{v}</b></div>)}<div className="hx-meter"><i style={{'--w':`${55+i*9}%`}}/></div></div></div>
            <div className="hx-btxt"><span className="hx-tagline">{m.tag}</span><h4>{m.t}</h4><p>{m.d}</p></div></div>))}
        </div>
      </section>

      <section id="why" className="hx-inner hx-sec">
        <div className="hx-head rv"><div className="hx-eyebrow">{T('The problem','المشكلة')}</div><h2 className="hx-h2">{T('Your money disappears between site and office.','الفلوس بتضيع بين الموقع والمكتب.')}</h2><p className="hx-lead">{T('Four ways contractors leak profit every week — and what Hesaby puts in its place.','أربع طرق يتسرب بها الربح كل أسبوع — وما يضعه حسابي مكانها.')}</p></div>
        <div className="rv" style={{ paddingBlock: '100px 110px' }}><DisplayCards cards={[{ icon: <Receipt size={15} />, title: T('The receipt dies in a pocket','الفاتورة بتموت في الجيب'), description: T('Paper invoices get destroyed in dusty site pockets before Friday payroll. Snap a photo on site and it posts with vendor, tax ID and VAT before the engineer leaves.','الفواتير الورق بتتبهدل في جيوب الموقع قبل تصفية الجمعة. صوّرها في الموقع فتتسجّل بالمورّد والرقم الضريبي والضريبة قبل ما المهندس يمشي.'), tag: T('Every Friday','كل جمعة'), className: '[grid-area:stack] -skew-y-[8deg] transition-all duration-500 max-sm:[grid-area:auto] max-sm:skew-y-0 max-sm:translate-x-0 max-sm:translate-y-0 translate-x-0 translate-y-0 hover:-translate-y-10 hover:scale-[1.02] group-hover/dc:opacity-60 hover:!opacity-100 max-sm:hover:translate-y-0 max-sm:hover:scale-100 dim' }, { icon: <FileSpreadsheet size={15} />, title: T('Three versions of the truth','ثلاث نسخ للحقيقة'), description: T('Site runs v3, office runs v5, the bank matches neither. One live ledger both sides read, with safe balances updating the moment spend is approved.','الموقع شغّال على نسخة والمكتب على نسخة والبنك لا يطابق أيًا منهما. دفتر واحد حي يقرأه الطرفان، وأرصدة الخزائن تتحدث لحظة اعتماد المصروف.'), tag: T('v3 vs v5','نسخة ضد نسخة'), className: '[grid-area:stack] -skew-y-[8deg] transition-all duration-500 max-sm:[grid-area:auto] max-sm:skew-y-0 max-sm:translate-x-0 max-sm:translate-y-0 translate-x-20 translate-y-6 hover:-translate-y-16 hover:scale-[1.02] group-hover/dc:opacity-60 hover:!opacity-100 max-sm:hover:translate-y-0 max-sm:hover:scale-100 dim' }, { icon: <ShieldCheck size={15} />, title: T('“Who approved this?” on WhatsApp','"مين اعتمد؟" على واتساب'), description: T('A 150,000 EGP delivery nobody remembers authorizing. Role thresholds with a timestamped trail — engineer, manager, executive — no voice-note approvals.','توريدة بـ 150 ألف جنيه لا أحد يذكر من اعتمدها. حدود صلاحيات بسجل موقّت — مهندس ومدير وإدارة — بلا اعتمادات صوتية.'), tag: T('150,000 EGP','150 ألف جنيه'), className: '[grid-area:stack] -skew-y-[8deg] transition-all duration-500 max-sm:[grid-area:auto] max-sm:skew-y-0 max-sm:translate-x-0 max-sm:translate-y-0 translate-x-40 translate-y-12 hover:-translate-y-24 hover:scale-[1.02] group-hover/dc:opacity-60 hover:!opacity-100 max-sm:hover:translate-y-0 max-sm:hover:scale-100 dim' }, { icon: <TrendingUp size={15} />, title: T('Margin shock at project close','صدمة الهامش عند التسليم'), description: T('You learn the 10% margin became 4% six months too late. Management fees move to office revenue on every approval, so net margin is visible daily.','تكتشف أن هامش 10% أصبح 4% بعد فوات الأوان بستة أشهر. نسبة الإشراف تتحوّل لإيراد المكتب مع كل اعتماد، فيظهر الصافي يوميًا.'), tag: T('10% → 4%','10% ← 4%'), className: '[grid-area:stack] -skew-y-[8deg] transition-all duration-500 max-sm:[grid-area:auto] max-sm:skew-y-0 max-sm:translate-x-0 max-sm:translate-y-0 translate-x-60 translate-y-18 hover:-translate-y-6 hover:scale-[1.02] group-hover/dc:opacity-60 hover:!opacity-100 max-sm:hover:translate-y-0 max-sm:hover:scale-100' }]} /></div>
      </section>

      <section className="hx-inner hx-sec"><div className="hx-split rv">
        <div><div className="hx-eyebrow">{T('Field app','تطبيق الموقع')}</div><h2 className="hx-h2" style={{marginTop:12}}>{T('Designed for sun, dust and gloves.','مصمم للشمس والتراب والقفازات.')}</h2><p className="hx-lead">{T('The engineer carries the ledger in his pocket: high-contrast field mode readable in direct sun, one-hand voice and photo capture, live custody balance before spending, and an offline queue that syncs the moment Wi-Fi returns. The office sees it all without a single phone call.','المهندس يحمل الدفتر في جيبه: وضع ميداني عالي التباين يُقرأ تحت الشمس المباشرة، والتقاط صوتي وفوتوغرافي بيد واحدة، ورصيد العهدة ظاهر قبل الصرف، وقائمة دون إنترنت تتزامن لحظة عودة الواي فاي. والمكتب يرى كل ذلك دون مكالمة واحدة.')}</p>
        <div style={{display:'flex',gap:10,marginTop:20,flexWrap:'wrap'}}><span className="hx-pill"><Smartphone size={13}/> iOS & Android · {T('one-hand capture','التقاط بيد واحدة')}</span><span className="hx-pill"><Zap size={13}/> {T('Offline queue · auto-sync','قائمة دون إنترنت · مزامنة تلقائية')}</span></div></div>
        <div><div className="hx-phone"><div className="hx-screen"><div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><b style={{fontSize:13}}>Hesaby Field · {T('Al-Amal','الأمل')}</b><span className="hx-conf">Online</span></div><div className="hx-cell" style={{marginBottom:10}}><label>{T('My custody left','المتبقي من عهدتي')}</label><b>86,400 EGP</b></div><div className="hx-cell" style={{marginBottom:10}}><label>{T('Project safe','خزينة المشروع')}</label><b>2,450,000 EGP</b></div><div className="hx-rows"><div className="hx-rowline"><span>{T('Ready-mix · today 11:20','خرسانة جاهزة · اليوم 11:20')}</span><b style={{color:'#ef4444'}}>-24,500</b></div><div className="hx-rowline"><span>{T('Rebar batch #12 · yesterday','حديد دفعة 12 · أمس')}</span><b style={{color:'#ef4444'}}>-85,000</b></div></div></div></div></div>
      </div></section>

      <section id="pricing" className="hx-inner hx-sec">
        <div className="hx-head rv"><div className="hx-eyebrow">{T('Pricing','الأسعار')}</div><h2 className="hx-h2">{T('Start free. Scale with sites.','ابدأ مجانًا. وتوسّع مع مواقعك.')}</h2><p className="hx-lead">{T('Run your first project free as long as you need. Upgrade when you add sites, seats or AI volume — annual billing saves 20% on every paid plan.','شغّل مشروعك الأول مجانًا مهما طالت المدة. وانتقل للمدفوع عندما تضيف مواقع أو مستخدمين أو عمليات ذكاء اصطناعي — والفوترة السنوية توفّر 20% على كل باقة مدفوعة.')}</p>
        <div className="hx-bill"><button onClick={()=>setCycle('monthly')} className={cn(cycle==='monthly'&&'on')}>{T('Monthly','شهري')}</button><button onClick={()=>setCycle('annual')} className={cn(cycle==='annual'&&'on')}>{T('Annual −20%','سنوي −٢٠٪')}</button></div></div>
        <div className="hx-plans">{plans.map(p=>{const ent=p.price==null;const price=!ent?((cycle==='annual')?Math.round(p.price*12*.8):p.price):null;const feats=(isRTL?p.fAr:p.f)||[];return(
          <div key={p.key} className={cn('hx-plan rv',p.pop&&'pop')} style={{'--rv-d':`${(({FREE:0,PREMIUM:.08,BUSINESS:.16,ENTERPRISE:.24})[p.key] ?? 0).toFixed(2)}s`}}><h3>{isRTL?p.nAr:p.n}{p.pop&&<span className="hx-pop">{T('POPULAR','الأكثر')}</span>}</h3><p className="hx-pdesc">{isRTL?p.dAr:p.d}</p>
          <div>{ent?<span className="hx-price" style={{fontSize:22}}>{T('Custom','مخصص')}</span>:p.price===0?<span className="hx-price" style={{fontSize:22}}>{T('Free','مجاني')}</span>:<><span className="hx-price">{currency(price)}</span> <span className="hx-per">/ {cycle==='annual'?T('yr','سنة'):T('mo','شهر')}</span></>}</div>
          <ul className="hx-feats">{feats.slice(0,5).map(f=><li key={f}><Check size={14}/>{f}</li>)}</ul>
          <Link to={user?'/billing':'/signup'} className={cn('hx-btn',p.pop?'hx-btn-fire':'hx-btn-ghost')} style={{width:'100%'}}>{ent?T('Talk to us','كلمنا'):p.price===0?T('Start free','ابدأ مجانًا'):T('Choose','اختر')}</Link></div>);})}</div>
      </section>

      <section className="hx-inner hx-sec"><LampContainer className="rv min-h-[560px] rounded-[26px] border border-[var(--line2)] lamp-tight">
        <motion.div
          initial={{ opacity: 0.5, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="flex flex-col items-center text-center lamp-ink"
        >
          <div style={{display:'flex',justifyContent:'center',marginBottom:18}}><span className="hx-logo-chip" style={{width:52,height:52,borderRadius:14}}><img src="/hesaby_logo_icon.svg" alt="Hesaby" style={{width:40,height:40}} /></span></div>
          <h2 className="hx-h2" style={{color:'#f5f4f0'}}>{T('Run your next project on Hesaby.','شغّل مشروعك القادم على حسابي.')}</h2>
          <p className="hx-lead" style={{maxWidth:600,marginInline:'auto',color:'#a8a29e'}}>{T('Bring one live project this week — its receipts, reports, custody and bank lines. By Friday you will know its true cost, its safe balance and your earned fee, down to the pound.','أحضر مشروعًا واحدًا حيًا هذا الأسبوع — بفواتيره وتقاريره وعهدته وكشوف بنكه. وبحلول الجمعة ستعرف تكلفته الحقيقية ورصيد خزينته وأتعابك المستحقة، حتى آخر جنيه.')}</p>
          <div className="hx-ctas"><Link to={user?'/dashboard':'/signup'} className="hx-btn hx-btn-fire" style={{padding:'15px 34px',fontSize:15}}>{T('Start free — no card needed','ابدأ مجانًا — بلا بطاقة')}</Link></div>
          <p className="hx-micro2">{T('Free for 1 project · Arabic-first · Cancel anytime','مجاني لمشروع واحد · عربي أولًا · إلغاء في أي وقت')}</p>
        </motion.div>
      </LampContainer></section>
      <footer className="hx-footer"><div className="hx-inner hx-foot"><span style={{display:'inline-flex',alignItems:'center',gap:10}}><span className="hx-logo-chip" style={{width:28,height:28,borderRadius:8}}><img src="/hesaby_logo_icon.svg" alt="Hesaby" style={{width:20,height:20}} /></span><b style={{color:'var(--text)'}}>Hesaby</b> — {T('Your voice, instantly logged.','صوتك، حساباتك، فورًا.')}</span><span>© {new Date().getFullYear()} · EN / عربي</span></div></footer>
      {isMobile && (<div className="tube-dock"><TubeNav id="tube-dock" items={navItems} active={active} onSelect={pick} /></div>)}
    </div>
    </MotionConfig>
  );
}
