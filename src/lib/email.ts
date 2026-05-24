import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,  // Gmail App Password, not your login password
  },
});

export async function sendOtpEmail(to: string, otp: string, businessName: string) {
  await transporter.sendMail({
    from:    `"${businessName}" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your password reset code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1d4ed8;margin-bottom:8px;">${businessName}</h2>
        <p style="color:#374151;margin-bottom:24px;">
          You requested a password reset. Use the code below — it expires in <strong>15 minutes</strong>.
        </p>
        <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#111827;">
            ${otp}
          </span>
        </div>
        <p style="color:#6b7280;font-size:14px;">
          If you didn't request this, you can safely ignore this email.
          Your password will not be changed.
        </p>
      </div>
    `,
  });
}