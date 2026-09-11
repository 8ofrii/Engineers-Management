const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../client/src/pages/Landing.jsx');
let raw = fs.readFileSync(targetPath, 'utf8');
const isCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

// 1. Update SCEN with bilingual amt and vat
const oldSCEN = `const SCEN = [
  { id:'ezz', tAr:'فاتورة حديد عز', tEn:'Ezz Steel', vAr:'حديد عز', vEn:'Ezz Steel', pAr:'برج الأمل', pEn:'Al-Amal Tower', amt:'185,000 EGP', vat:'25,900 EGP', itemsAr:'4 طن حديد 16مم و12مم', itemsEn:'4t rebar 16/12mm', conf:'99.8%' },
  { id:'laf', tAr:'فاتورة لافارج', tEn:'Lafarge', vAr:'لافارج مصر', vEn:'Lafarge Egypt', pAr:'فيلا التجمع', pEn:'New Cairo Villa', amt:'42,600 EGP', vat:'5,964 EGP', itemsAr:'15 طن أسمنت', itemsEn:'15t cement', conf:'99.4%' },
  { id:'fuel', tAr:'إيصال وقود', tEn:'Fuel receipt', vAr:'وطنية', vEn:'Watanya', pAr:'العاصمة الإدارية', pEn:'New Capital', amt:'8,500 EGP', vat:'1,190 EGP', itemsAr:'سولار للحفار والمولد', itemsEn:'Diesel — excavator', conf:'99.1%' },
];`;

const newSCEN = `const SCEN = [
  { id:'ezz', tAr:'فاتورة حديد عز', tEn:'Ezz Steel', vAr:'حديد عز', vEn:'Ezz Steel', pAr:'برج الأمل', pEn:'Al-Amal Tower', amt:'185,000 EGP', amtAr:'185,000 ج.م', vat:'25,900 EGP', vatAr:'25,900 ج.م', itemsAr:'4 طن حديد 16مم و12مم', itemsEn:'4t rebar 16/12mm', conf:'99.8%' },
  { id:'laf', tAr:'فاتورة لافارج', tEn:'Lafarge', vAr:'لافارج مصر', vEn:'Lafarge Egypt', pAr:'فيلا التجمع', pEn:'New Cairo Villa', amt:'42,600 EGP', amtAr:'42,600 ج.م', vat:'5,964 EGP', vatAr:'5,964 ج.م', itemsAr:'15 طن أسمنت', itemsEn:'15t cement', conf:'99.4%' },
  { id:'fuel', tAr:'إيصال وقود', tEn:'Fuel receipt', vAr:'وطنية', vEn:'Watanya', pAr:'العاصمة الإدارية', pEn:'New Capital', amt:'8,500 EGP', amtAr:'8,500 ج.م', vat:'1,190 EGP', vatAr:'1,190 ج.م', itemsAr:'سولار للحفار والمولد', itemsEn:'Diesel — excavator', conf:'99.1%' },
];`;

if (!content.includes(oldSCEN)) {
  console.error('Could not find oldSCEN');
  process.exit(1);
}
content = content.replace(oldSCEN, newSCEN);

// 2. Update OCR simulator card amounts
content = content.replace(
  '<b className="g">{sc.amt}</b>',
  '<b className="g">{isRTL ? sc.amtAr : sc.amt}</b>'
);
content = content.replace(
  '<div className="hx-cell"><label>{T(\'VAT 14%\',\'ضريبة ١٤٪\')}</label><b>{sc.vat}</b></div>',
  '<div className="hx-cell"><label>{T(\'VAT 14%\',\'ضريبة ١٤٪\')}</label><b>{isRTL ? sc.vatAr : sc.vat}</b></div>'
);
content = content.replace(
  '<p className="hx-p" style={{textAlign:\'center\'}}>{sc.amt} → {isRTL?sc.pAr:sc.pEn}',
  '<p className="hx-p" style={{textAlign:\'center\'}}>{isRTL ? sc.amtAr : sc.amt} → {isRTL?sc.pAr:sc.pEn}'
);

// 3. Update Safes simulator KPI amounts
content = content.replace(
  '<label>{T(\'Project safe · Al-Amal\',\'خزينة المشروع · الأمل\')}</label><b>2,450,000 EGP</b>',
  '<label>{T(\'Project safe · Al-Amal\',\'خزينة المشروع · الأمل\')}</label><b>{T(\'2,450,000 EGP\',\'2,450,000 ج.م\')}</b>'
);
content = content.replace(
  '<label>{T(\'Office safe · supervision earned\',\'خزينة المكتب · إشراف محصّل\')}</label><b style={{color:\'#22c55e\'}}>367,500 EGP</b>',
  '<label>{T(\'Office safe · supervision earned\',\'خزينة المكتب · إشراف محصّل\')}</label><b style={{color:\'#22c55e\'}}>{T(\'367,500 EGP\',\'367,500 ج.م\')}</b>'
);

// 4. Update Modules Section cards (User Screenshot issue)
const oldModulesGrid = `        <div className="hx-grid6">
          {[{c:'c3',tag:T('Receipt OCR','مسح الفواتير'),t:T('Invoices that type themselves','فواتير بتسجّل نفسها'),d:T('Arabic and English invoices scanned in seconds — vendor, tax ID, line items, 14% VAT — then posted to the right safe with a sealed audit trail. No data entry team, no Friday scramble.','فواتير عربي وإنجليزي بتتمسح في ثواني — المورّد والرقم الضريبي والبنود وضريبة ١٤٪ — وبتترحّل للخزينة الصح بسجل تدقيق مقفول. من غير فريق إدخال ولا لخبطة الجمعة.'),v:[['Ezz Steel · Al-Amal','185,000'],['VAT 14% · posted','25,900'],['Audit trail','Sealed']]},
            {c:'c3',tag:T('Safes & custody','الخزائن والعهد'),t:T('Balances you\\'d bet your margin on','أرصدة تراهن عليها بهامشك'),d:T('Project safes fenced per site, engineer custody capped by role, office supervision fees moved on approval. The owner sees site cost and office profit separately — live, not month-end.','خزائن مشاريع مسيّجة لكل موقع، عهد مهندسين مسقوفة بالدور، نسبة الإشراف بتتحوّل مع الاعتماد. صاحب الشركة بيشوف تكلفة الموقع وربح المكتب منفصلين — لحظي، مش آخر الشهر.'),v:[['Available across sites','2,480,500'],['Office earned · 15%','367,500'],['Last auto-move','+3,675']]},
            {c:'c2',tag:'DSR',t:T('Site diary in two minutes flat','يومية الموقع في دقيقتين بالظبط'),d:T('Weather, headcounts, deliveries, pours and consultant e-sign — filed one-handed from the scaffold and locked to the project ledger same day.','الطقس والأعداد والتوريدات والصب وتوقيع الاستشاري — بتتقدّم بإيد واحدة من السقالة وبتتقفل على دفتر المشروع نفس اليوم.'),v:[['Labor present','34'],['Concrete poured','60 m³'],['Consultant','Signed 4:40 PM']]},
            {c:'c2',tag:T('Payroll & draws','الأجور والمستخلصات'),t:T('Wages settled, zero disputes','أجور متصفية ومقفولة بلا خلافات'),d:T('Craft rates, day counts, advances and deductions computed once per cycle, then sealed into contractor draws anyone can audit. Clear numbers, zero ambiguity.','فئات الحرف وأيام التشغيل والسلف والخصومات بتتحسب مرة واحدة كل دورة، وبتتقفل في مستخلصات واضحة ومعتمدة يقدر الكل يراجعها بكل شفافية.'),v:[['Rebar draw #4','45,000'],['Advances deducted','9,200'],['Status','Locked']]},
            {c:'c2',tag:T('Inventory','المخازن'),t:T('Stock tracked to the last ton','المخزون متتبّع لآخر طن'),d:T('Cement and rebar deliveries matched against actual pour consumption per work item, with safety thresholds per site — waste shows up as a number, not a rumor.','توريدات الأسمنت والحديد بتتطابق مع المنصرف الفعلي لكل بند شغل، بحدود أمان لكل موقع — الهدر بيبان رقم، مش كلام.'),v:[['Rebar 16mm on hand','18.5t'],['Site safety level','5.0t'],['This week used','6.2t']]}].map((m,i)=>(
            <div key={i} className={cn('hx-b rv',m.c)} style={{'--rv-d':\`\${(i*0.08).toFixed(2)}s\`}}><div className="hx-viz"><div className="hx-vizcard">{m.v.map(([k,v])=><div key={k} className="hx-vr"><span>{k}</span><b>{v}</b></div>)}<div className="hx-meter"><i style={{'--w':\`\${55+i*9}%\`}}/></div></div></div>
            <div className="hx-btxt"><span className="hx-tagline">{m.tag}</span><h4>{m.t}</h4><p>{m.d}</p></div></div>))}
        </div>`;

const newModulesGrid = `        <div className="hx-grid6">
          {[{c:'c3',tag:T('Receipt OCR','مسح الفواتير'),t:T('Invoices that type themselves','فواتير بتسجّل نفسها'),d:T('Arabic and English invoices scanned in seconds — vendor, tax ID, line items, 14% VAT — then posted to the right safe with a sealed audit trail. No data entry team, no Friday scramble.','فواتير عربي وإنجليزي بتتمسح في ثواني — المورّد والرقم الضريبي والبنود وضريبة ١٤٪ — وبتترحّل للخزينة الصح بسجل تدقيق مقفول. من غير فريق إدخال ولا لخبطة الجمعة.'),v:[[T('Ezz Steel · Al-Amal','حديد عز · برج الأمل'),T('185,000','185,000')],[T('VAT 14% · posted','ضريبة ١٤٪ · مرحّلة'),T('25,900','25,900')],[T('Audit trail','سجل التدقيق'),T('Sealed','معتمد ومقفل')]]},
            {c:'c3',tag:T('Safes & custody','الخزائن والعهد'),t:T('Balances you\\'d bet your margin on','أرصدة تراهن عليها بهامشك'),d:T('Project safes fenced per site, engineer custody capped by role, office supervision fees moved on approval. The owner sees site cost and office profit separately — live, not month-end.','خزائن مشاريع مسيّجة لكل موقع، عهد مهندسين مسقوفة بالدور، نسبة الإشراف بتتحوّل مع الاعتماد. صاحب الشركة بيشوف تكلفة الموقع وربح المكتب منفصلين — لحظي، مش آخر الشهر.'),v:[[T('Available across sites','المتاح بالمشاريع'),T('2,480,500','2,480,500')],[T('Office earned · 15%','أرباح المكتب · ١٥٪'),T('367,500','367,500')],[T('Last auto-move','آخر تحويل تلقائي'),T('+3,675','+3,675')]]},
            {c:'c2',tag:'DSR',t:T('Site diary in two minutes flat','يومية الموقع في دقيقتين بالظبط'),d:T('Weather, headcounts, deliveries, pours and consultant e-sign — filed one-handed from the scaffold and locked to the project ledger same day.','الطقس والأعداد والتوريدات والصب وتوقيع الاستشاري — بتتقدّم بإيد واحدة من السقالة وبتتقفل على دفتر المشروع نفس اليوم.'),v:[[T('Labor present','حضور العمالة'),T('34','34')],[T('Concrete poured','صب الخرسانة'),T('60 m³','60 م³')],[T('Consultant','الاستشاري'),T('Signed 4:40 PM','معتمد 4:40 م')]]},
            {c:'c2',tag:T('Payroll & draws','الأجور والمستخلصات'),t:T('Wages settled, zero disputes','أجور متصفية ومقفولة بلا خلافات'),d:T('Craft rates, day counts, advances and deductions computed once per cycle, then sealed into contractor draws anyone can audit. Clear numbers, zero ambiguity.','فئات الحرف وأيام التشغيل والسلف والخصومات بتتحسب مرة واحدة كل دورة، وبتتقفل في مستخلصات واضحة ومعتمدة يقدر الكل يراجعها بكل شفافية.'),v:[[T('Rebar draw #4','مستخلص حدادة #4'),T('45,000','45,000')],[T('Advances deducted','خصم السلف'),T('9,200','9,200')],[T('Status','الحالة'),T('Locked','معتمد ومقفل')]]},
            {c:'c2',tag:T('Inventory','المخازن'),t:T('Stock tracked to the last ton','المخزون متتبّع لآخر طن'),d:T('Cement and rebar deliveries matched against actual pour consumption per work item, with safety thresholds per site — waste shows up as a number, not a rumor.','توريدات الأسمنت والحديد بتتطابق مع المنصرف الفعلي لكل بند شغل، بحدود أمان لكل موقع — الهدر بيبان رقم، مش كلام.'),v:[[T('Rebar 16mm on hand','حديد 16مم بالموقع'),T('18.5t','18.5 طن')],[T('Site safety level','حد الأمان بالموقع'),T('5.0t','5.0 طن')],[T('This week used','المنصرف أسبوعيًا'),T('6.2t','6.2 طن')]]}].map((m,i)=>(
            <div key={i} className={cn('hx-b rv',m.c)} style={{'--rv-d':\`\${(i*0.08).toFixed(2)}s\`}}><div className="hx-viz"><div className="hx-vizcard">{m.v.map(([k,v],vi)=><div key={vi} className="hx-vr"><span>{k}</span><b>{v}</b></div>)}<div className="hx-meter"><i style={{'--w':\`\${55+i*9}%\`}}/></div></div></div>
            <div className="hx-btxt"><span className="hx-tagline">{m.tag}</span><h4>{m.t}</h4><p>{m.d}</p></div></div>))}
        </div>`;

if (!content.includes(oldModulesGrid)) {
  console.error('Could not find oldModulesGrid');
  process.exit(1);
}
content = content.replace(oldModulesGrid, newModulesGrid);

// 5. Update Field App Phone Card
content = content.replace(
  '<span className="hx-conf">Online</span>',
  '<span className="hx-conf">{T(\'Online\',\'متصل\')}</span>'
);
content = content.replace(
  '<b>86,400 EGP</b>',
  '<b>{T(\'86,400 EGP\',\'86,400 ج.م\')}</b>'
);
content = content.replace(
  '<b>2,450,000 EGP</b>',
  '<b>{T(\'2,450,000 EGP\',\'2,450,000 ج.م\')}</b>'
);

fs.writeFileSync(targetPath, isCRLF ? content.replace(/\n/g, '\r\n') : content, 'utf8');
console.log('Successfully added full Arabic translations to all preview cards!');
