const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../client/src/pages/Landing.jsx');
let raw = fs.readFileSync(targetPath, 'utf8');
const isCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

const replacements = [
  // 1. Hero Subtitle: remove "غرفة حرب"
  {
    old: `{T('Hesaby turns site chaos into clean books: photograph an invoice on the scaffold and it lands in the right project safe with vendor, VAT and audit trail — before you climb down. Daily reports, custody, approvals and bank matching all run on the same ledger, so month-end stops being a war room.','حسابي بيحوّل فوضى الموقع لدفاتر نضيفة: صوّر الفاتورة وانت على السقالة، وهتنزل في خزينة المشروع الصح بالمورّد والضريبة وسجل التدقيق — قبل ما تنزل انت. التقارير اليومية والعهد والاعتمادات والمطابقة البنكية كلهم على نفس الدفتر، فآخر الشهر يبطّل يكون غرفة حرب.')}`,
    new: `{T('Hesaby turns site chaos into clean books: photograph an invoice on the scaffold and it lands in the right project safe with vendor, VAT and audit trail — before you climb down. Daily reports, custody, approvals and bank matching all run on the same ledger, so month-end closing runs smoothly without pressure or surprises.','حسابي بيحوّل فوضى الموقع لدفاتر نضيفة: صوّر الفاتورة وانت على السقالة، وهتنزل في خزينة المشروع الصح بالمورّد والضريبة وسجل التدقيق — قبل ما تنزل انت. التقارير اليومية والعهد والاعتمادات والمطابقة البنكية كلهم على نفس الدفتر، فإقفال آخر الشهر يبطّل يكون ضغط وتوتر ومفاجآت.')}`
  },
  // 2. Safes Simulator Tab (user's screenshot): remove "مش في خناقة" / "not in a shouting match"
  {
    old: `{T('Every project has its own safe — materials, subcontractors, daily labor. The office earns only its supervision cut, moved automatically the second a site expense is approved. The owner sees true site cost and true office profit in two columns, not in a shouting match.','كل مشروع ليه خزينته — مواد ومقاولين ويومية. المكتب بيحصّل بس نسبة الإشراف، بتتحوّل أوتوماتيك لحظة اعتماد مصروف الموقع. صاحب الشركة بيشوف تكلفة الموقع الحقيقية وربح المكتب الحقيقي في عمودين، مش في خناقة.')}`,
    new: `{T('Every project has its own safe — materials, subcontractors, daily labor. The office earns only its supervision cut, moved automatically the second a site expense is approved. The owner sees true site cost and true office profit side by side — with total clarity and zero ambiguity.','كل مشروع ليه خزينته — مواد ومقاولين ويومية. المكتب بيحصّل بس نسبة الإشراف، بتتحوّل أوتوماتيك لحظة اعتماد مصروف الموقع. صاحب الشركة بيشوف تكلفة الموقع الحقيقية وربح المكتب الحقيقي جنب لجنب، بمنتهى الوضوح والشفافية ومن غير أي لبس.')}`
  },
  // 3. Modules: Payroll & draws: remove "مش بتتخانق عليها" and "من غير كلام فاضي"
  {
    old: `{c:'c2',tag:T('Payroll & draws','الأجور والمستخلصات'),t:T('Wages settled, not argued','أجور بتتصفّى، مش بتتخانق عليها'),d:T('Craft rates, day counts, advances and deductions computed once per cycle, then sealed into contractor draws anyone can audit. No he-said-she-said.','فئات الحرف وأعداد الأيام والسلف والخصومات بتتحسب مرة كل دورة، وبتتقفل في مستخلصات أي حد يقدر يراجعها. من غير كلام فاضي.'),v:[['Rebar draw #4','45,000'],['Advances deducted','9,200'],['Status','Locked']]}`,
    new: `{c:'c2',tag:T('Payroll & draws','الأجور والمستخلصات'),t:T('Wages settled, zero disputes','أجور متصفية ومقفولة بلا خلافات'),d:T('Craft rates, day counts, advances and deductions computed once per cycle, then sealed into contractor draws anyone can audit. Clear numbers, zero ambiguity.','فئات الحرف وأيام التشغيل والسلف والخصومات بتتحسب مرة واحدة كل دورة، وبتتقفل في مستخلصات واضحة ومعتمدة يقدر الكل يراجعها بكل شفافية.'),v:[['Rebar draw #4','45,000'],['Advances deducted','9,200'],['Status','Locked']]}`
  },
  // 4. Why Cards:
  // Card 1: "الجيب الورّاني" -> "جيوب الموقع"
  {
    old: `title: T('The receipt dies in a back pocket','الفاتورة بتموت في الجيب الورّاني')`,
    new: `title: T('The receipt vanishes in site pockets','الفاتورة بتضيع في جيوب الموقع')`
  },
  // Card 3: "مفيش بني آدم فاكر مين اللي وافق عليها" -> "محدش مسجّل مين اللي اعتمدها"
  {
    old: `description: T('A 150,000 EGP delivery nobody remembers authorizing. Role thresholds with a timestamped trail — engineer, manager, executive — no voice-note approvals.','توريدة بـ ١٥٠ ألف جنيه مفيش بني آدم فاكر مين اللي وافق عليها. حدود صلاحيات بسجل موقّت ومختوم — مهندس، مدير، إدارة — مفيش اعتمادات بفويسات واتساب.')`,
    new: `description: T('A 150,000 EGP delivery nobody has record of authorizing. Role thresholds with a timestamped trail — engineer, manager, executive — no approvals lost in chat threads.','توريدة بـ ١٥٠ ألف جنيه محدش مسجّل مين اللي اعتمدها. مسار صلاحيات بسجل موقّت ومختوم — مهندس، مدير، إدارة — من غير اعتمادات تايهة في رسائل واتساب.')`
  },
  // 5. Field App Headline: "إيدين عليها أسمنت" -> "ظروف الموقع الصعبة"
  {
    old: `{T('Made for sun, dust and cement-caked hands.','مصمم للشمس والتراب وإيدين عليها أسمنت.')}`,
    new: `{T('Made for sun, dust and tough job sites.','مصمم للشمس والتراب وظروف الموقع الصعبة.')}`
  }
];

replacements.forEach((r, idx) => {
  if (!content.includes(r.old)) {
    console.error(`Could not find replacement #${idx + 1}`);
    process.exit(1);
  }
  content = content.replace(r.old, r.new);
});

fs.writeFileSync(targetPath, isCRLF ? content.replace(/\n/g, '\r\n') : content, 'utf8');
console.log('Successfully polished Landing.jsx copy with professional, respectable language!');
