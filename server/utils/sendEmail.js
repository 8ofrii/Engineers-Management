import nodemailer from 'nodemailer';
import logger from '../lib/logger.js';

/**
 * Enterprise Email Sender
 * Supports:
 * 1. Resend API (HTTPS Port 443 — Recommended for VPS where SMTP ports are blocked)
 * 2. Standard SMTP (Gmail, Brevo, SendGrid, etc.)
 */
const sendEmail = async (options) => {
    const senderEmail = process.env.SMTP_EMAIL?.trim() || 'onboarding@resend.dev';
    const fromName = 'Hesaby ERP | نظام حسابي';

    // Helper to strip HTML tags for plain-text fallback
    const plainText = options.text || options.message.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Check if Resend HTTPS API Key is available (Bypasses all VPS firewall port blocks)
    if (process.env.RESEND_API_KEY) {
        try {
            let fromHeader = (process.env.RESEND_FROM || 'onboarding@resend.dev').trim();
            if (!fromHeader.includes('<') && !fromHeader.includes('>')) {
                fromHeader = `Hesaby ERP <${fromHeader}>`;
            }

            const payload = {
                from: fromHeader,
                to: [options.email],
                subject: options.subject,
                html: options.message,
                text: plainText,
                headers: {
                    'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    'X-Hesaby-Notification-Type': 'transactional-verification'
                }
            };

            if (options.attachments && Array.isArray(options.attachments) && options.attachments.length > 0) {
                payload.attachments = options.attachments.map(att => ({
                    filename: att.filename,
                    content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content
                }));
            }

            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to send email via Resend API');
            }

            logger.info({ emailId: data.id, to: options.email }, 'Email sent via Resend HTTPS API');
            return;
        } catch (err) {
            logger.error({ err }, 'Resend API delivery failed');
            throw err;
        }
    }

    // 2. SMTP fallback
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        throw new Error(
            'Email cannot be sent: SMTP_EMAIL and SMTP_PASSWORD (or RESEND_API_KEY) must be set in the environment.'
        );
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user: process.env.SMTP_EMAIL.trim(),
            pass: process.env.SMTP_PASSWORD.replace(/\s+/g, '').trim()
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000
    });

    const mailOptions = {
        from: `${fromName} <${process.env.SMTP_EMAIL.trim()}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
        ...(options.attachments ? { attachments: options.attachments } : {})
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info({ messageId: info.messageId }, 'Email sent via SMTP');
};

export default sendEmail;
