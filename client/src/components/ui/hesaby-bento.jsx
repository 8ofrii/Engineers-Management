import React from "react";
import { BentoCard } from "@/components/ui/bento";
import { 
  Sparkles, 
  Wallet, 
  FileSpreadsheet, 
  Users, 
  Boxes, 
  ShieldCheck, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight 
} from "lucide-react";

export default function HesabyBentoGrid({ isAr = true }) {
  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto" dir={isAr ? "rtl" : "ltr"}>
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          {isAr ? "إدارة المشاريع الهندسية المتكاملة" : "Enterprise Construction Intelligence"}
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
          {isAr ? "كل ما تحتاجه لإدارة الموقع من مكان واحد" : "Everything You Need to Command Your Job Sites"}
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-400">
          {isAr 
            ? "ودّع الفوضى والأوراق. حسّن التدفقات النقدية، وراقب تكاليف المقاولين، واستخرج تقارير الموقع بنقرة زر."
            : "Eliminate paper chaos. Safeguard cash flow, track subcontractor draw schedules, and automate daily site reports."}
        </p>
      </div>

      {/* Elevated Glass Tray Container Behind All Cards */}
      <div className="rounded-3xl p-5 sm:p-8 bg-slate-900/60 border border-white/15 backdrop-blur-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)] relative overflow-hidden">
        {/* Ambient diffuse backlights */}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-6 lg:grid-rows-2 relative z-10">
          {/* 1. AI OCR & Receipt Extraction (Large 3-col span) */}
          <BentoCard
            eyebrow={
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-orange-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                {isAr ? "الذكاء الاصطناعي وOCR" : "AI Receipt Scanner"}
              </span>
            }
            title={isAr ? "مسح فواتير التوريد تلقائياً بدقة 99.8%" : "Zero-Typing Material & Fuel OCR"}
            description={
              isAr
                ? "التقط صورة إيصال الأسمنت أو الحديد أو المحروقات، ليقوم الذكاء الاصطناعي باستخراج البنود وضريبة القيمة المضافة وربطها بالمشروع فوراً."
                : "Snap a photo of any rebar or cement invoice on-site. Gemini AI instantly parses line items, supplier tax numbers, and allocates expenses."
            }
            graphic={
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-950 to-orange-950/50 p-6 flex items-center justify-center">
                <div className="w-full max-w-md bg-slate-800/90 border-2 border-orange-500/30 rounded-xl p-5 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-mono text-slate-300 font-semibold">OCR Extraction · عز للحديد</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/30">99.8% Confidence</span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>المورد:</span> <span className="text-white font-medium">شركة حديد عز للصناعة</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>المبلغ:</span> <span className="text-emerald-400 font-bold text-sm">185,000 EGP</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>المشروع:</span> <span className="text-orange-300">برج الأمل السكني</span>
                    </div>
                  </div>
                </div>
              </div>
            }
            fade={["bottom"]}
            className="lg:col-span-3 border-orange-500/30 hover:border-orange-400/80 shadow-[0_12px_36px_rgba(249,115,22,0.12)]"
          />

          {/* 2. Real-Time Cash Flow & Safe Balances (Large 3-col span) */}
          <BentoCard
            eyebrow={
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                <Wallet className="w-3.5 h-3.5" />
                {isAr ? "الخزينة والمالية" : "Project Liquidity & Safe"}
              </span>
            }
            title={isAr ? "التحكم الكامل برصيد الخزائن والعهد" : "Real-Time Custody Wallets & Safe Balances"}
            description={
              isAr
                ? "شاهد رصيد عهدة كل مهندس موقع وخزينة كل مشروع لحظياً، مع دورات اعتماد سريعة تمنع تجاوز الميزانية التقديرية."
                : "Live custody wallets for site engineers with multi-level approval hierarchies that prevent project budget overruns."
            }
            graphic={
              <div className="absolute inset-0 bg-gradient-to-bl from-slate-900/90 via-slate-950 to-emerald-950/50 p-6 flex items-center justify-center">
                <div className="w-full max-w-md bg-slate-800/90 border-2 border-emerald-500/30 rounded-xl p-5 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-300 font-medium">رصيد خزينة المشاريع المتاح</span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> +18.4%
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-4">2,480,500 <span className="text-sm font-normal text-slate-400">EGP</span></div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-[68%]" />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                    <span>المصروف: 68%</span>
                    <span>المتبقي: 32%</span>
                  </div>
                </div>
              </div>
            }
            fade={["bottom"]}
            className="lg:col-span-3 border-emerald-500/30 hover:border-emerald-400/80 shadow-[0_12px_36px_rgba(16,185,129,0.12)]"
          />

          {/* 3. Daily Site Reports DSR (2-col span) */}
          <BentoCard
            eyebrow={
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-blue-400 font-semibold">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {isAr ? "تقارير الموقع DSR" : "Daily Site Reports"}
              </span>
            }
            title={isAr ? "سجلات يومية موثقة ومعتمدة" : "Bulletproof Daily Site Reports"}
            description={
              isAr
                ? "حضور العمالة، الطقس، نسب الإنجاز، وملاحظات الاستشاري مع توقيع المشرف الإلكتروني."
                : "Track weather conditions, labor headcounts, progress milestones, and supervisor approvals."
            }
            graphic={
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-950 to-blue-950/50 p-5 flex items-center justify-center">
                <div className="w-full bg-slate-800/90 border-2 border-blue-500/30 rounded-xl p-4 font-mono text-xs text-slate-200 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تقرير رقم DSR-2026-104 معتمد</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">الخرسانة المسلحة لأعمدة الدور الثالث: 100%</p>
                </div>
              </div>
            }
            fade={["bottom"]}
            className="lg:col-span-2 border-blue-500/30 hover:border-blue-400/80 shadow-[0_12px_36px_rgba(59,130,246,0.12)]"
          />

          {/* 4. Subcontractors & Workforce (2-col span) */}
          <BentoCard
            eyebrow={
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-400 font-semibold">
                <Users className="w-3.5 h-3.5" />
                {isAr ? "مقاولو الباطن والعمالة" : "Subcontractor Wages"}
              </span>
            }
            title={isAr ? "مستخلصات المقاولين بدقة" : "Automated Wage Payroll"}
            description={
              isAr
                ? "حساب يوميات المعلمين والمساعدين مع خصم السلفيات وصرف مستخلصات المقاولين بأمان."
                : "Manage labor headcounts, craft rates, advance deductions, and contract draw milestones."
            }
            graphic={
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-950 to-amber-950/50 p-5 flex items-center justify-center">
                <div className="w-full bg-slate-800/90 border-2 border-amber-500/30 rounded-xl p-4 font-mono text-xs text-slate-200 shadow-2xl backdrop-blur-md">
                  <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                    <span className="font-semibold">مقاول الحدادة المسلحة</span>
                    <span className="text-amber-400 font-bold">مستخلص #4</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">صافي المستحق بعد السلف: 45,000 EGP</p>
                </div>
              </div>
            }
            fade={["bottom"]}
            className="lg:col-span-2 border-amber-500/30 hover:border-amber-400/80 shadow-[0_12px_36px_rgba(245,158,11,0.12)]"
          />

          {/* 5. Inventory & Batches (2-col span) */}
          <BentoCard
            eyebrow={
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-purple-400 font-semibold">
                <Boxes className="w-3.5 h-3.5" />
                {isAr ? "المخازن والتوريدات" : "Batch Material Control"}
              </span>
            }
            title={isAr ? "جرد المخازن وتتبع التوريدات" : "Real-Time Stock Depletion"}
            description={
              isAr
                ? "ربط توريد المواد بالمنصرف الفعلي لكل بند تنفيذي لمنع الهدر والتلاعب."
                : "Track incoming material shipments, warehouse receipts, and on-site consumption."
            }
            graphic={
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-950 to-purple-950/50 p-5 flex items-center justify-center">
                <div className="w-full bg-slate-800/90 border-2 border-purple-500/30 rounded-xl p-4 font-mono text-xs text-slate-200 shadow-2xl backdrop-blur-md">
                  <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                    <span className="font-semibold">رصيد حديد 16مم</span>
                    <span className="text-purple-300 font-bold">18.5 طن</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">حد الأمان في الموقع: 5.0 طن</p>
                </div>
              </div>
            }
            fade={["bottom"]}
            className="lg:col-span-2 border-purple-500/30 hover:border-purple-400/80 shadow-[0_12px_36px_rgba(168,85,247,0.12)]"
          />
        </div>
      </div>
    </section>
  );
}
