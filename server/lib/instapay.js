import dotenv from 'dotenv';
dotenv.config();

/**
 * InstaPay & Bank Transfer Target Configuration.
 * Loads from environment variables with defaults.
 */
export const getInstaPayConfig = () => {
    dotenv.config();
    return {
        enabled: process.env.INSTAPAY_ENABLED !== 'false',
        ipa: process.env.INSTAPAY_IPA || '01092041908@instapay',
        accountName: process.env.INSTAPAY_ACCOUNT_NAME || 'Nooraldeen Ahmed (نور الدين أحمد)',
        bankName: process.env.INSTAPAY_BANK_NAME || 'Commercial International Bank - CIB (البنك التجاري الدولي)',
        accountNumber: process.env.INSTAPAY_ACCOUNT_NUMBER || '100039231632',
        iban: process.env.INSTAPAY_IBAN || '',
        phone: process.env.INSTAPAY_PHONE || '+201092041908',
        whatsapp: process.env.INSTAPAY_WHATSAPP || '+201092041908',
        qrCodeUrl: process.env.INSTAPAY_QR_CODE || '',
        instructions: {
            en: '1. Open the InstaPay App on your phone.\n2. Transfer the exact amount to the InstaPay IPA, Phone number, or CIB Bank Account.\n3. Put the Order Reference Code in the transfer notes/memo.\n4. Upload the screenshot/receipt below and click Confirm.',
            ar: '1. افتح تطبيق إنستاباي (InstaPay) على هاتفك.\n2. قم بتحويل المبلغ المحدد إلى عنوان إنستاباي (IPA) أو رقم الهاتف أو حساب بنك CIB الموضح.\n3. اكتب كود مرجع الطلب في خانة الملاحظات أثناء التحويل.\n4. ارفع صورة إيصال التحويل واضغط على تأكيد التحويل لتفعيل الاشتراك فوراً.'
        }
    };
};

/**
 * Generate a unique, short, human-readable order reference code.
 * Example: IPN-739281
 */
export const generateReferenceCode = () => {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `IPN-${num}`;
};
