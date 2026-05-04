import nodemailer from 'nodemailer';

// SMTP creds come from env only — never hardcoded. The previous fallback
// (a Gmail app password literal) was committed to a public repo and had to
// be rotated; do not re-introduce defaults here.
const sendEmail = async (options) => {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        throw new Error(
            'Email cannot be sent: SMTP_EMAIL and SMTP_PASSWORD must be set in the environment.'
        );
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: `Civil Engine <${process.env.SMTP_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
        // Optional attachments (Phase 5: invoice PDFs). Each: { filename, content, contentType }
        ...(options.attachments ? { attachments: options.attachments } : {})
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
};

export default sendEmail;
