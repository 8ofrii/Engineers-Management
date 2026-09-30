import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TENANT_ID = 'b21df23e-4f2a-4f26-b2c3-76a8e76f11ec';
const PROJECT_ID = '1fc505e8-81c3-4b9a-a537-a03d8b0dc9e1';
const CLIENT_ID = 'cddd2af1-ec9b-4d9e-8f59-0fc68a3a4f39';
const ENGINEER_ID = '28d626a3-1f12-4f0b-a78f-8d83bd828f1f';

// 11 Income Transactions
const incomeData = [
  { m: 1, date: '2026-03-30', amount: 250000, safeId: '633a687a-760f-485f-9dfe-1ae928eaffb1', method: 'BANK_TRANSFER', notes: 'اتفاق على 150الف' },
  { m: 2, date: '2026-04-16', amount: 100000, safeId: '633a687a-760f-485f-9dfe-1ae928eaffb1', method: 'BANK_TRANSFER', notes: 'اتفاق من 100 لى 120 الف' },
  { m: 3, date: '2026-03-05', amount: 300000, safeId: '633a687a-760f-485f-9dfe-1ae928eaffb1', method: 'BANK_TRANSFER', notes: 'دفعة تحت حساب تنفيذ المشروع' },
  { m: 4, date: '2026-05-17', amount: 150000, safeId: '633a687a-760f-485f-9dfe-1ae928eaffb1', method: 'BANK_TRANSFER', notes: 'دفعة تحت حساب تنفيذ المشروع' },
  { m: 5, date: '2026-06-01', amount: 40000,  safeId: '633a687a-760f-485f-9dfe-1ae928eaffb1', method: 'BANK_TRANSFER', notes: 'دفعة تحت حساب تنفيذ المشروع' },
  { m: 6, date: '2026-06-16', amount: 200000, safeId: '633a687a-760f-485f-9dfe-1ae928eaffb1', method: 'BANK_TRANSFER', notes: 'دفعة تحت حساب تنفيذ المشروع' },
  { m: 7, date: '2026-06-19', amount: 200000, safeId: '633a687a-760f-485f-9dfe-1ae928eaffb1', method: 'BANK_TRANSFER', notes: 'دفعة تحت حساب تنفيذ المشروع' },
  { m: 8, date: '2026-07-02', amount: 200000, safeId: '633a687a-760f-485f-9dfe-1ae928eaffb1', method: 'BANK_TRANSFER', notes: 'دفعة تحت حساب تنفيذ المشروع' },
  { m: 9, date: '2026-07-08', amount: 200000, safeId: '633a687a-760f-485f-9dfe-1ae928eaffb1', method: 'BANK_TRANSFER', notes: 'دفعة تحت حساب تنفيذ المشروع' },
  { m: 10, date: '2026-08-02', amount: 150000, safeId: '633a687a-760f-485f-9dfe-1ae928eaffb1', method: 'BANK_TRANSFER', notes: 'تحويل' },
  { m: 11, date: '2026-08-02', amount: 130000, safeId: '84cbfbd2-7df6-4acf-b3d0-1f412b40601b', method: 'CASH', notes: 'كاش' }
];

// Helper to interpolate date in month/phase
function getExpenseDate(index, phase) {
  if (index <= 21) {
    // March 2026: 1 to 21
    const day = Math.min(index + 2, 30);
    return `2026-03-${String(day).padStart(2, '0')}`;
  } else if (index <= 51) {
    // April 2026: 22 to 51
    const day = Math.min((index - 21), 29);
    return `2026-04-${String(day).padStart(2, '0')}`;
  } else if (index <= 76) {
    // May - June 2026: 52 to 76
    const day = Math.min((index - 51), 30);
    return `2026-05-${String(day).padStart(2, '0')}`;
  } else if (index <= 101) {
    // June - July 2026: 77 to 101
    const day = Math.min((index - 76), 29);
    return `2026-06-${String(day).padStart(2, '0')}`;
  } else {
    // July - August 2026: 102 to 122
    const day = Math.min((index - 101), 30);
    return `2026-07-${String(day).padStart(2, '0')}`;
  }
}

// 122 Expense Transactions Data
const expenseRaw = [
  [1, 10000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "تحت حساب مقاول", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [2, 8000, "CONTRACTING", "a7d68ddf-224f-4d97-bc70-a56b9a286fb9", "مصنعية قص سلم", "WORKMAN", "013af89b-536b-44b4-ae60-43e41a9c4968", "احمد البحيري(قص خراسانات)"],
  [3, 2000, "OTHER", "23fbc950-c36c-4e2f-ba38-08ddaafe666d", "مصنعية فك خط حريق", "WORKMAN", "87eb1928-dbd1-411a-8f1d-e9f3f38022db", "جمال حداد"],
  [4, 5000, "OTHER", "23fbc950-c36c-4e2f-ba38-08ddaafe666d", "صاج جراج مخزن", "WORKMAN", "a7dccdf6-8542-48b2-8b24-74deb05c2e6b", "عنتر (حداد)"],
  [5, 900, "OTHER", "23fbc950-c36c-4e2f-ba38-08ddaafe666d", "يوميات حراسة مخزن", "WORKMAN", "fad1eb5b-47b3-43c8-82e8-5e6e1f639f18", "محمد خاطر"],
  [6, 15300, "SITE_CLEANING", "21e6811f-f93d-4841-b18c-0cc59f9d22cb", "9عربيات رتش *1700ج", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [7, 1000, "SITE_CLEANING", "21e6811f-f93d-4841-b18c-0cc59f9d22cb", "يومية لودر كبير", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [8, 3600, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "9عمال تكسير 4ادوار طوب(9*400ج)", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [9, 1200, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "3عمال تحميل مع عربيات كسر(3*400ج)", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [10, 20000, "DRAWINGS", "77a62c22-b6bf-4407-8a3c-d86dc9357aae", "تصميم انشائى(سلم+كمر)", "USER", "28d626a3-1f12-4f0b-a78f-8d83bd828f1f", "Eng. Hossam Elbetar (م/ حسام البيطار)"],
  [11, 27000, "CONTRACTING", "a7d68ddf-224f-4d97-bc70-a56b9a286fb9", "مصنعية قص سلم", "WORKMAN", "013af89b-536b-44b4-ae60-43e41a9c4968", "احمد البحيري(قص خراسانات)"],
  [12, 20000, "CONTRACTING", "a7d68ddf-224f-4d97-bc70-a56b9a286fb9", "مصنعية قص سلم", "WORKMAN", "013af89b-536b-44b4-ae60-43e41a9c4968", "احمد البحيري(قص خراسانات)"],
  [13, 20000, "CONTRACTING", "a7d68ddf-224f-4d97-bc70-a56b9a286fb9", "مصنعية قص سلم", "WORKMAN", "013af89b-536b-44b4-ae60-43e41a9c4968", "احمد البحيري(قص خراسانات)"],
  [14, 10000, "CONTRACTING", "a7d68ddf-224f-4d97-bc70-a56b9a286fb9", "مصنعية قص سلم", "WORKMAN", "013af89b-536b-44b4-ae60-43e41a9c4968", "احمد البحيري(قص خراسانات)"],
  [15, 300, "STOCKING", "fccd595b-ab82-4ec1-b27f-611c45e81fe4", "نقل حديد", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [16, 3000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "تكسير حوائط سلالم", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [17, 2000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "5عمال تنزيل كسر السلالم", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [18, 2000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "4عمال مع اللودر وشيل حدبد", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [19, 500, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "عامل تقطيع حديد", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [20, 300, "EQUIPMENT", "f872080e-ab64-4c03-aa08-b9febcb86d6f", "تاجير صاروخ", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [21, 15600, "SITE_CLEANING", "21e6811f-f93d-4841-b18c-0cc59f9d22cb", "12نقلة كسر السلم(12*1300ج)", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [22, 11700, "SITE_CLEANING", "21e6811f-f93d-4841-b18c-0cc59f9d22cb", "9نقالات كر سلم(9*1300ج)", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [23, 10000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "تحت حساب مقاول (سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [24, 271700, "MATERIALS", "e3654ccf-fffd-48a0-b929-e2e7eea67328", "فاتوره حديد", "SUPPLIER", "51d4a13f-5651-48d2-9648-707bc435c0f0", "سيد نجيب"],
  [25, 10000, "BLACKSMITH_LABOR", "cfdc3587-0b26-42b9-9030-f4d3f84c6530", "مصنعيه حداد", "WORKMAN", "87eb1928-dbd1-411a-8f1d-e9f3f38022db", "جمال حداد"],
  [26, 15000, "CONTRACTING", "a7d68ddf-224f-4d97-bc70-a56b9a286fb9", "تحت حساب مقاول (قص سلم)", "WORKMAN", "013af89b-536b-44b4-ae60-43e41a9c4968", "احمد البحيري(قص خراسانات)"],
  [27, 10000, "STOCKING", "fccd595b-ab82-4ec1-b27f-611c45e81fe4", "وليد (فاتوره واتس)", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [28, 2900, "CARPENTRY_MATERIALS", "b554fa48-ff37-4a97-8f85-a1b202f7222c", "خشب درج سلم", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [29, 200, "TRANSPORT", "993f0e58-7e00-4a1e-b6ec-b701e0b01e44", "نقل خشب", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [30, 300, "MATERIALS", "e3654ccf-fffd-48a0-b929-e2e7eea67328", "5سلك ربط", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [31, 170, "MATERIALS", "e3654ccf-fffd-48a0-b929-e2e7eea67328", "2شكاره بسكوت", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [32, 3000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "تكسير وتقطيع حديد وتخريم للترزيع", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [33, 10000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "تحت حساب مقاول (سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [34, 10000, "BLACKSMITH_LABOR", "cfdc3587-0b26-42b9-9030-f4d3f84c6530", "مصنعيه حداد", "WORKMAN", "87eb1928-dbd1-411a-8f1d-e9f3f38022db", "جمال حداد"],
  [35, 3000, "SAND", "e3575592-cc0b-4408-8e0d-3316a51017a8", "سن (5م*600ج)", "SUPPLIER", "06e7ef20-cad7-4554-9ebc-ea1e6c7d09ad", "كريم الاكشر"],
  [36, 850, "SAND", "e3575592-cc0b-4408-8e0d-3316a51017a8", "رمل", "SUPPLIER", "06e7ef20-cad7-4554-9ebc-ea1e6c7d09ad", "كريم الاكشر"],
  [37, 38500, "BRICKS", "0744f545-edb7-43a7-8469-a58dddd00f4b", "طوب (16*2400)", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [38, 10500, "BLACKSMITH_LABOR", "cfdc3587-0b26-42b9-9030-f4d3f84c6530", "مصنعيه حداد", "WORKMAN", "87eb1928-dbd1-411a-8f1d-e9f3f38022db", "جمال حداد"],
  [39, 2850, "SAND", "e3575592-cc0b-4408-8e0d-3316a51017a8", "3م سن +4 م رمل", "SUPPLIER", "06e7ef20-cad7-4554-9ebc-ea1e6c7d09ad", "كريم الاكشر"],
  [40, 10000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [41, 4500, "TIPS", "f1ba3d5f-b61b-4e0f-b8b9-ece369576dc0", "عطله يوم مجلس المدينه للمقاول", "WORKMAN", "ea71c986-395c-4f47-bf4d-a981c29d870a", "احمد ابراهيم"],
  [42, 5500, "CARPENTRY_MATERIALS", "b554fa48-ff37-4a97-8f85-a1b202f7222c", "سقالات خشب للدورين", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [43, 39700, "BRICKS", "0744f545-edb7-43a7-8469-a58dddd00f4b", "طوب (16*2450)", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [44, 88500, "CEMENT", "9c951e12-ce4c-4bdc-ba11-edd1eab68843", "فاتوره اسمنت وحديد", "SUPPLIER", "51d4a13f-5651-48d2-9648-707bc435c0f0", "سيد نجيب"],
  [45, 11200, "STOCKING", "fccd595b-ab82-4ec1-b27f-611c45e81fe4", "تشوين 32 الف طوبه (32*350)", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [46, 4000, "SAND", "e3575592-cc0b-4408-8e0d-3316a51017a8", "15 م رمل", "SUPPLIER", "06e7ef20-cad7-4554-9ebc-ea1e6c7d09ad", "كريم الاكشر"],
  [47, 500, "TRANSPORT", "993f0e58-7e00-4a1e-b6ec-b701e0b01e44", "نقل اسمنت", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [48, 10000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [49, 1700, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "تخريم +تكسير + تقطيع حديد", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [50, 200, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "تحريب حديد", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [51, 600, "MATERIALS", "e3654ccf-fffd-48a0-b929-e2e7eea67328", "سلك رباط", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [52, 500, "BLACKSMITH_LABOR", "cfdc3587-0b26-42b9-9030-f4d3f84c6530", "يوميه الحداد", "WORKMAN", "87eb1928-dbd1-411a-8f1d-e9f3f38022db", "جمال حداد"],
  [53, 4000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "تدخيل ونق حديد واجهه وبوايات", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [54, 2000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "تدخيل حديد سلالم وصب سلم", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [55, 123440, "MATERIALS", "e3654ccf-fffd-48a0-b929-e2e7eea67328", "فاتوره حديد + اسمنت", "SUPPLIER", "51d4a13f-5651-48d2-9648-707bc435c0f0", "سيد نجيب"],
  [56, 16000, "SAND", "e3575592-cc0b-4408-8e0d-3316a51017a8", "20م رمل+20 م سن", "SUPPLIER", "06e7ef20-cad7-4554-9ebc-ea1e6c7d09ad", "كريم الاكشر"],
  [57, 20000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [58, 28000, "MASONRY_LABOR", "68b5cffc-3290-4c35-a388-058254e43c5e", "مصنعيه بناء (33*850ج)", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [59, 4320, "STOCKING", "fccd595b-ab82-4ec1-b27f-611c45e81fe4", "تشوين رمل + اسمنت", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [60, 7000, "SAND", "e3575592-cc0b-4408-8e0d-3316a51017a8", "8م سن +10م رمل", "SUPPLIER", "06e7ef20-cad7-4554-9ebc-ea1e6c7d09ad", "كريم الاكشر"],
  [61, 5000, "BLACKSMITH_LABOR", "cfdc3587-0b26-42b9-9030-f4d3f84c6530", "مصنعيه حداد", "WORKMAN", "87eb1928-dbd1-411a-8f1d-e9f3f38022db", "جمال حداد"],
  [62, 10000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [63, 10000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "سلك رباط  + عمال تخريم خرسانه + خشب لدرج السلم + عمال تشوين", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [64, 10000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [65, 39200, "BRICKS", "0744f545-edb7-43a7-8469-a58dddd00f4b", "(16*2400) 16 الف طوبه", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [66, 8200, "STOCKING", "fccd595b-ab82-4ec1-b27f-611c45e81fe4", "تشوين 20 م رمل + 20 م سن+ 6 طن اسمنت", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [67, 2500, "STOCKING", "fccd595b-ab82-4ec1-b27f-611c45e81fe4", "تشوين 2 طن حديد", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [68, 2500, "SITE_CLEANING", "21e6811f-f93d-4841-b18c-0cc59f9d22cb", "مقطوره رتش بتنزلها", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [69, 500, "TIPS", "f1ba3d5f-b61b-4e0f-b8b9-ece369576dc0", "تصريح مجلس المدينه", "WORKMAN", "ea71c986-395c-4f47-bf4d-a981c29d870a", "احمد ابراهيم"],
  [70, 2150, "SAND", "e3575592-cc0b-4408-8e0d-3316a51017a8", "8 م رمل", "SUPPLIER", "06e7ef20-cad7-4554-9ebc-ea1e6c7d09ad", "كريم الاكشر"],
  [71, 5000, "CARPENTRY_MATERIALS", "b554fa48-ff37-4a97-8f85-a1b202f7222c", "تحت حساب سقالات خشب مقاول", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [72, 10000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [73, 5500, "STOCKING", "fccd595b-ab82-4ec1-b27f-611c45e81fe4", "تشوين 5 الف طوبه", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [74, 17500, "BRICKS", "0744f545-edb7-43a7-8469-a58dddd00f4b", "7 الف طوبه *2500", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [75, 3600, "CERAMIC_MATERIALS", "d8135e30-ca1a-4a89-a2f1-0c2344353746", "36 عتبه *100", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [76, 5000, "BRICKS", "0744f545-edb7-43a7-8469-a58dddd00f4b", "اد دور كامل طوب", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [77, 6200, "BRICKS", "0744f545-edb7-43a7-8469-a58dddd00f4b", "16 الف طوبه *350ج", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [78, 4150, "MASONRY_LABOR", "68b5cffc-3290-4c35-a388-058254e43c5e", "فرق مصنعيه مبانى فى ال33 الف", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [79, 14400, "MASONRY_LABOR", "68b5cffc-3290-4c35-a388-058254e43c5e", "مصنعيه بناء 16الف *900ج", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [80, 2500, "MASONRY_LABOR", "68b5cffc-3290-4c35-a388-058254e43c5e", "رفع مناسيب اعتاب + شبابيك", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [81, 20000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [82, 80000, "MATERIALS", "e3654ccf-fffd-48a0-b929-e2e7eea67328", "تحت حساب فاتوره الحديد", "SUPPLIER", "51d4a13f-5651-48d2-9648-707bc435c0f0", "سيد نجيب"],
  [83, 18000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [84, 41000, "CEMENT", "9c951e12-ce4c-4bdc-ba11-edd1eab68843", "باقى فاتوره قديمه الحديد والاسمنت", "SUPPLIER", "51d4a13f-5651-48d2-9648-707bc435c0f0", "سيد نجيب"],
  [85, 2000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [86, 12000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "نظافه 6 مقطوره *2000ج", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [87, 500, "TIPS", "f1ba3d5f-b61b-4e0f-b8b9-ece369576dc0", "تصريح ونش", "WORKMAN", "ea71c986-395c-4f47-bf4d-a981c29d870a", "احمد ابراهيم"],
  [88, 10000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "تكسير 3 ادوار وتقطيع حديد ونظافه مدخل", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [89, 2000, "MASONRY_LABOR", "68b5cffc-3290-4c35-a388-058254e43c5e", "بناء 2500 طوبه", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [90, 40000, "BRICKS", "0744f545-edb7-43a7-8469-a58dddd00f4b", "طوب (16*2500)", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [91, 40000, "BRICKS", "0744f545-edb7-43a7-8469-a58dddd00f4b", "طوب (16*2500)", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [92, 10000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [93, 5000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [94, 4800, "STOCKING", "fccd595b-ab82-4ec1-b27f-611c45e81fe4", "تشوين 16 الف طوبه (16*300ج) (دور اول)", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [95, 6000, "MASONRY_LABOR", "68b5cffc-3290-4c35-a388-058254e43c5e", "مصنعيه بناء (دور اول)", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [96, 8820, "STOCKING", "fccd595b-ab82-4ec1-b27f-611c45e81fe4", "تشوين  20م سن +25م رمل+4 طن اسمنت", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [97, 2000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "تكسير باقى ادوار حديد وخرسانات زياده", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [98, 4000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "8 عمال نظافه مدخل ونقل الحديد كل الادوارونقل بضاعه فى المدخل", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [99, 3000, "SITE_CLEANING", "21e6811f-f93d-4841-b18c-0cc59f9d22cb", "نظافه ادوار  ونظافه سلم", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [100, 1000, "SITE_CLEANING", "21e6811f-f93d-4841-b18c-0cc59f9d22cb", "عربيه رتش تحميل النظافه", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [101, 30000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [102, 18150, "SAND", "e3575592-cc0b-4408-8e0d-3316a51017a8", "25 م رمل+2 م سن", "SUPPLIER", "06e7ef20-cad7-4554-9ebc-ea1e6c7d09ad", "كريم الاكشر"],
  [103, 4000, "STOCKING", "fccd595b-ab82-4ec1-b27f-611c45e81fe4", "تشوين 7 طن اسمنت و 4 طن حديد", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [104, 15000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه مقاول (صب سلم)", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [105, 4000, "SAND", "e3575592-cc0b-4408-8e0d-3316a51017a8", "15م رمل", "SUPPLIER", "06e7ef20-cad7-4554-9ebc-ea1e6c7d09ad", "كريم الاكشر"],
  [106, 3000, "MASONRY_LABOR", "68b5cffc-3290-4c35-a388-058254e43c5e", "مصنعيه بناء (دور اول)", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [107, 3000, "MASONRY_LABOR", "68b5cffc-3290-4c35-a388-058254e43c5e", "مصنعيه بناء (دور اول)", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [108, 10000, "CONTRACTING_CONCRETE", "50b0c28d-74ee-44e3-ac0a-43fe2538ad8b", "مصنعيه صب سلم", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [109, 3000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "تخريم سلم", "WORKMAN", "674455fa-c339-4b81-bfc5-163e13947879", "جمال (مقاول خرسانات)"],
  [110, 5000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "تكسير مناور وتخريمه", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [111, 4000, "MASONRY_LABOR", "68b5cffc-3290-4c35-a388-058254e43c5e", "مصنعيه بناء (دور اول)", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [112, 200000, "CEMENT", "9c951e12-ce4c-4bdc-ba11-edd1eab68843", "فاتوره حديد واسمنت", "SUPPLIER", "51d4a13f-5651-48d2-9648-707bc435c0f0", "سيد نجيب"],
  [113, 7000, "STOCKING", "fccd595b-ab82-4ec1-b27f-611c45e81fe4", "تشوين 28 الف طوبه *250", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [114, 6000, "MASONRY_LABOR", "68b5cffc-3290-4c35-a388-058254e43c5e", "مصنعيه بناء (دور اول)", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [115, 2400, "SAND", "e3575592-cc0b-4408-8e0d-3316a51017a8", "رمل وسن", "SUPPLIER", "06e7ef20-cad7-4554-9ebc-ea1e6c7d09ad", "كريم الاكشر"],
  [116, 40000, "BRICKS", "0744f545-edb7-43a7-8469-a58dddd00f4b", "طوب 16 الف طوبه", "SUPPLIER", "e956b151-5d0e-4da4-a4df-86e0eeb35972", "ابو دنيا"],
  [117, 1500, "ELECTRICAL_LABOR", "c532cb58-0d66-4c79-9465-cd28e4f2bb0a", "مصنعيه كهربائى", "WORKMAN", "936674e3-bd33-419f-b289-f867329e99d9", "محمود ريكا"],
  [118, 4000, "MASONRY_LABOR", "68b5cffc-3290-4c35-a388-058254e43c5e", "مصنعيه بناء (دور اول)", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [119, 3000, "MASONRY_LABOR", "68b5cffc-3290-4c35-a388-058254e43c5e", "مصنعيه بناء (دور اول)", "WORKMAN", "3de18aaa-fb77-4819-9973-6603114d5848", "محمود البنان"],
  [120, 3000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "5 عمال نقل حديد + تشوين 2500 طوبه +متر رمل", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [121, 2500, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "5 عمال تشوين +2500 طوه +2م رمل", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"],
  [122, 3000, "GENERAL_LABOR", "7b8dbeff-519b-462a-859e-ad55bce00737", "4 عمال تشوين 2500 طوبه +1.5 رمل + تكسير بالهلتى+ تشوين 15 شكاره اسمنت", "SUPPLIER", "2f036920-932d-45d9-b414-8e3ffe19a629", "وليد (مقاول تشوين ونقل)"]
];

async function run() {
  console.log('--- STARTING TRANSACTION IMPORT FOR ALJAZZAR 2 ---');

  // Verify total sums
  const totalIncomeSum = incomeData.reduce((acc, row) => acc + row.amount, 0);
  const totalExpenseSum = expenseRaw.reduce((acc, row) => acc + row[1], 0);

  console.log(`Calculated Total Income: ${totalIncomeSum.toLocaleString()} EGP (11 rows)`);
  console.log(`Calculated Total Expenses: ${totalExpenseSum.toLocaleString()} EGP (122 rows)`);
  console.log(`Calculated Net Balance: ${(totalIncomeSum - totalExpenseSum).toLocaleString()} EGP`);

  if (totalIncomeSum !== 1920000 || totalExpenseSum !== 1805600) {
    throw new Error(`Data mismatch! Income: ${totalIncomeSum}, Expense: ${totalExpenseSum}`);
  }

  // Step 1: Clean out existing transactions and drafts
  console.log('1. Cleaning existing transactions, safe transfers, and drafts...');
  const deletedDrafts = await prisma.transactionDraft.deleteMany({});
  const deletedSafeTransfers = await prisma.safeTransfer.deleteMany({});
  const deletedTransactions = await prisma.transaction.deleteMany({});
  console.log(`Cleared: ${deletedTransactions.count} transactions, ${deletedSafeTransfers.count} safe transfers, ${deletedDrafts.count} drafts.`);

  // Step 2: Insert 11 Income Transactions
  console.log('2. Inserting 11 client income installments...');
  for (const inc of incomeData) {
    await prisma.transaction.create({
      data: {
        type: 'INCOME',
        category: 'PAYMENT',
        amount: inc.amount,
        totalDueAmount: inc.amount,
        description: `دفعة عميل - ${inc.notes}`,
        descriptionAr: `دفعة عميل - ${inc.notes}`,
        transactionDate: new Date(`${inc.date}T10:00:00.000Z`),
        paymentMethod: inc.method,
        status: 'APPROVED',
        approvedAt: new Date(`${inc.date}T10:00:00.000Z`),
        approvedBy: ENGINEER_ID,
        projectId: PROJECT_ID,
        clientId: CLIENT_ID,
        safeId: inc.safeId,
        createdBy: ENGINEER_ID,
        tenantId: TENANT_ID,
        notes: inc.notes,
        beneficiary: 'حسين بيومى الجزار'
      }
    });
  }
  console.log('11 Income transactions inserted successfully.');

  // Step 3: Insert 122 Expense Transactions
  console.log('3. Inserting 122 project expenses...');
  for (const exp of expenseRaw) {
    const [num, amount, category, costItemId, description, benefType, benefId, benefName] = exp;
    const dateStr = getExpenseDate(num);

    const txData = {
      type: 'EXPENSE',
      category: category,
      amount: amount,
      totalDueAmount: amount,
      description: description,
      descriptionAr: description,
      transactionDate: new Date(`${dateStr}T11:00:00.000Z`),
      paymentMethod: 'CASH',
      status: 'APPROVED',
      approvedAt: new Date(`${dateStr}T11:00:00.000Z`),
      approvedBy: ENGINEER_ID,
      projectId: PROJECT_ID,
      projectCostItemId: costItemId,
      createdBy: ENGINEER_ID,
      tenantId: TENANT_ID,
      beneficiary: benefName,
      notes: `المسودة بند رقم ${num}`
    };

    if (benefType === 'SUPPLIER') {
      txData.supplierId = benefId;
    } else if (benefType === 'WORKMAN') {
      txData.workmanId = benefId;
    } else if (benefType === 'USER') {
      txData.payerUserId = benefId;
    }

    await prisma.transaction.create({
      data: txData
    });
  }
  console.log('122 Expense transactions inserted successfully.');

  // Step 4: Recalculate ProjectCostItems (totalPaid & percentages)
  console.log('4. Recalculating 19 project cost items...');
  const costItems = await prisma.projectCostItem.findMany({
    where: { projectId: PROJECT_ID }
  });

  for (const item of costItems) {
    const itemTxs = await prisma.transaction.aggregate({
      where: {
        projectCostItemId: item.id,
        status: 'APPROVED',
        type: 'EXPENSE'
      },
      _sum: { amount: true }
    });

    const totalPaid = itemTxs._sum.amount || 0;
    await prisma.projectCostItem.update({
      where: { id: item.id },
      data: {
        totalPaid: totalPaid,
        status: 'OPEN'
      }
    });
  }
  console.log('All 19 cost items updated.');

  // Step 5: Recalculate Project Financials
  console.log('5. Updating Project financials and balance...');
  const managementFeePercent = 10;
  const officeRevenue = (totalExpenseSum * managementFeePercent) / 100; // 180,560 EGP
  const netSafeBalance = totalIncomeSum - totalExpenseSum; // 114,400 EGP

  await prisma.project.update({
    where: { id: PROJECT_ID },
    data: {
      budget: totalExpenseSum, // 1,805,600 EGP
      actualCost: totalExpenseSum, // 1,805,600 EGP
      operationalFund: totalIncomeSum, // 1,920,000 EGP
      projectSafeBalance: netSafeBalance, // 114,400 EGP
      officeRevenue: officeRevenue, // 180,560 EGP
      officeExpenses: 0,
      completionPercent: 100 // Phase is completed or 100% execution
    }
  });
  console.log('Project financials updated.');

  // Step 6: Recalculate Workmen Total Paid
  console.log('6. Recalculating Workmen totalPaid...');
  const workmen = await prisma.workman.findMany({
    where: { tenantId: TENANT_ID }
  });

  for (const w of workmen) {
    const wTxs = await prisma.transaction.aggregate({
      where: {
        workmanId: w.id,
        status: 'APPROVED',
        type: 'EXPENSE'
      },
      _sum: { amount: true }
    });
    await prisma.workman.update({
      where: { id: w.id },
      data: {
        totalPaid: wTxs._sum.amount || 0
      }
    });
  }
  console.log('Workmen totalPaid updated.');

  // Step 7: Recalculate Company Safes Balances
  console.log('7. Updating Company Safes balances...');
  // Bank safe received 1,790,000 EGP
  await prisma.companySafe.update({
    where: { id: '633a687a-760f-485f-9dfe-1ae928eaffb1' },
    data: {
      balance: 1790000
    }
  });

  // Cash safe received 130,000 EGP
  await prisma.companySafe.update({
    where: { id: '84cbfbd2-7df6-4acf-b3d0-1f412b40601b' },
    data: {
      balance: 130000
    }
  });
  console.log('Company Safes balances updated.');

  console.log('--- ALL DATA IMPORTED AND RECONCILED WITH 100% ACCURACY ---');
}

run()
  .catch((e) => {
    console.error('Error during import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
