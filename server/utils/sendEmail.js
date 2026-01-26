import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // Create transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_EMAIL || 'ai.8ofry@gmail.com',
            pass: process.env.SMTP_PASSWORD || 'yzqyrydbisjfbdkv'
        }
    });

    // Define email options
    const mailOptions = {
        from: `Civil Engine <${process.env.SMTP_EMAIL || 'ai.8ofry@gmail.com'}>`,
        to: options.email,
        subject: options.subject,
        html: options.message
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
};

export default sendEmail;
