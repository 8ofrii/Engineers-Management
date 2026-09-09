/**
 * Enterprise Email Templates for Hesaby ERP
 * Built for maximum inbox deliverability, responsiveness, and bilingual Arabic/English layout.
 */

const baseEmailWrapper = ({ title, preheader, contentHtml }) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <!--[if mso]>
    <style type="text/css">
        table {border-collapse:collapse;border-spacing:0;margin:0;}
        div, td {padding:0;}
        div {margin:0 !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <!-- Hidden Preheader for Inbox Preview -->
    <div style="display: none; font-size: 1px; color: #0b0f19; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        ${preheader || title}
    </div>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 10px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 30px; border-bottom: 1px solid #1f2937; text-align: center;">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        <div style="display: inline-block; background: linear-gradient(135deg, #ff5a36 0%, #ff8c42 100%); width: 44px; height: 44px; border-radius: 12px; line-height: 44px; text-align: center; color: #ffffff; font-size: 22px; font-weight: bold; margin-bottom: 12px; box-shadow: 0 8px 16px rgba(255, 90, 54, 0.3);">
                                            🏢
                                        </div>
                                        <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                                            Hesaby ERP <span style="color: #ff5a36;">|</span> نظام حسابي
                                        </h1>
                                        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px; font-weight: 500;">
                                            منظومة إدارة المقاولات والعمليات الهندسية الذكية
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 36px 30px; color: #e2e8f0; font-size: 15px; line-height: 1.7; text-align: right; direction: rtl;">
                            ${contentHtml}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0d131f; padding: 24px 30px; border-top: 1px solid #1f2937; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
                            <p style="margin: 0 0 8px 0; color: #94a3b8; font-weight: 600;">
                                © 2026 Hesaby ERP (نظام حسابي). جميع الحقوق محفوظة.
                            </p>
                            <p style="margin: 0; color: #64748b;">
                                هذا البريد الإلكتروني مرسل تلقائياً من خادم النظام الآمن. يرجى عدم الرد على هذه الرسالة.
                            </p>
                            <p style="margin: 8px 0 0 0; color: #475569; font-size: 11px;">
                                Security Hash: verified-transactional-auth • hesaby.aimicromind.com
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

/**
 * 1. Company Registration & 2FA Verification Email
 */
export const getVerificationEmailHtml = ({ companyName, adminName, verificationCode }) => {
    const title = 'رمز التحقق من البريد الإلكتروني | Hesaby ERP';
    const preheader = `رمز تفعيل مساحة عمل شركة ${companyName || ''} هو: ${verificationCode}`;

    const contentHtml = `
        <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
            مرحباً ${adminName ? adminName : 'بك'} 👋
        </h2>
        <p style="margin: 0 0 16px 0; color: #cbd5e1;">
            شكراً لانضمامك إلى <strong>Hesaby ERP</strong>. تم إنشاء مساحة عمل جديدة لشركتك: <strong style="color: #38bdf8;">${companyName}</strong> بنجاح.
        </p>
        <p style="margin: 0 0 24px 0; color: #cbd5e1;">
            يرجى إدخال رمز التحقق التالي لتأكيد ملكية الحساب وتفعيل النظام:
        </p>

        <!-- Verification Code Card -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
            <tr>
                <td align="center" style="background: rgba(255, 90, 54, 0.08); border: 2px dashed rgba(255, 90, 54, 0.4); border-radius: 12px; padding: 24px;">
                    <span style="display: block; font-size: 13px; font-weight: 700; color: #ff8c42; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                        رمز التحقق (6 أرقام)
                    </span>
                    <span style="display: inline-block; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #ffffff; font-family: monospace;">
                        ${verificationCode}
                    </span>
                    <span style="display: block; font-size: 12px; color: #94a3b8; margin-top: 10px;">
                        ⏱️ صلاحية الرمز: 10 دقائق فقط
                    </span>
                </td>
            </tr>
        </table>

        <!-- Security Warning -->
        <div style="background-color: rgba(30, 41, 59, 0.6); border-right: 4px solid #3b82f6; padding: 14px 16px; border-radius: 8px; margin-top: 24px;">
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                🔒 <strong>تنبيه أمني:</strong> لا تشارك هذا الرمز مع أي شخص. فريق الدعم في نظام حسابي لن يطلب منك هذا الرمز مطلقاً.
            </p>
        </div>
    `;

    return baseEmailWrapper({ title, preheader, contentHtml });
};

/**
 * 2. Password Reset Request Email
 */
export const getPasswordResetEmailHtml = ({ name, resetUrl }) => {
    const title = 'طلب إعادة تعيين كلمة المرور | Hesaby ERP';
    const preheader = 'انقر لتعيين كلمة مرور جديدة لحسابك في نظام حسابي ERP';

    const contentHtml = `
        <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
            طلب استعادة كلمة المرور
        </h2>
        <p style="margin: 0 0 16px 0; color: #cbd5e1;">
            مرحباً ${name ? name : ''}، لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في <strong>نظام حسابي ERP</strong>.
        </p>
        <p style="margin: 0 0 28px 0; color: #cbd5e1;">
            يمكنك تعيين كلمة مرور جديدة وآمنة من خلال النقر على الزر أدناه:
        </p>

        <!-- CTA Button -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
            <tr>
                <td align="center">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ff5a36 0%, #ff8c42 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; box-shadow: 0 8px 20px rgba(255, 90, 54, 0.35);">
                        إعادة تعيين كلمة المرور ➔
                    </a>
                </td>
            </tr>
        </table>

        <p style="margin: 24px 0 8px 0; font-size: 12px; color: #64748b; text-align: center;">
            أو يمكنك نسخ الرابط التالي مباشرة في متصفحك:
        </p>
        <p style="margin: 0; font-size: 12px; color: #38bdf8; word-break: break-all; text-align: center; direction: ltr;">
            ${resetUrl}
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.6); border-right: 4px solid #f59e0b; padding: 14px 16px; border-radius: 8px; margin-top: 28px;">
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                ⚠️ <strong>ملاحظة:</strong> إذا لم تقم بطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد بأمان وحسابك سيبقى محمياً.
            </p>
        </div>
    `;

    return baseEmailWrapper({ title, preheader, contentHtml });
};

/**
 * 3. Team Member Invitation Email
 */
export const getUserInviteEmailHtml = ({ name, companyName, email, roleName, inviteCode, inviteLink }) => {
    const title = `دعوة للانضمام إلى شركة ${companyName || 'حسابي ERP'}`;
    const preheader = `تمت دعوتك للانضمام إلى مساحة عمل ${companyName || 'حسابي ERP'} بدور: ${roleName || 'عضو فريق'}`;

    const contentHtml = `
        <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
            دعوة للانضمام إلى فريق العمل 👷‍♂️
        </h2>
        <p style="margin: 0 0 16px 0; color: #cbd5e1; line-height: 1.6;">
            مرحباً ${name ? name : ''}، تمت دعوتك للانضمام إلى مساحة عمل شركة <strong style="color: #38bdf8;">${companyName}</strong> على منظومة <strong>Hesaby ERP</strong> الهندسية بصلاحية: <strong style="color: #10b981;">${roleName || 'عضو فريق'}</strong>.
        </p>
        
        <!-- Invite Code Box -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
            <tr>
                <td align="center" style="background: rgba(59, 130, 246, 0.08); border: 2px dashed rgba(59, 130, 246, 0.4); border-radius: 12px; padding: 22px;">
                    <span style="display: block; font-size: 13px; font-weight: 700; color: #60a5fa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                        كود الانضمام للمساحة
                    </span>
                    <span style="display: inline-block; font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #ffffff; font-family: monospace;">
                        ${inviteCode}
                    </span>
                    <span style="display: block; font-size: 12px; color: #94a3b8; margin-top: 8px;">
                        ⏱️ صلاحية الدعوة: 7 أيام
                    </span>
                </td>
            </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
            <tr>
                <td align="center">
                    <a href="${inviteLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);">
                        قبول الدعوة وإكمال التسجيل ➔
                    </a>
                </td>
            </tr>
        </table>

        <p style="margin: 20px 0 6px 0; font-size: 12px; color: #64748b; text-align: center;">
            أو يمكنك فتح الرابط التالي مباشرة في متصفحك:
        </p>
        <p style="margin: 0; font-size: 12px; color: #38bdf8; word-break: break-all; text-align: center; direction: ltr;">
            ${inviteLink}
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.6); border-right: 4px solid #3b82f6; padding: 14px 16px; border-radius: 8px; margin-top: 24px;">
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                💡 <strong>معلومة:</strong> بالنقر على الرابط، ستتمكن من إدخال اسمك ورقم هاتفك وتعيين كلمة المرور الخاصة بك للانضمام الفوري للمساحة.
            </p>
        </div>
    `;

    return baseEmailWrapper({ title, preheader, contentHtml });
};
