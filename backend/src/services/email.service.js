import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { APP_NAME } from '../config/appConfig.js';

let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  if (env.emailUser && env.emailPass) {
    console.log('[Email] Sending via Gmail SMTP');
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.emailUser,
        pass: env.emailPass,
      },
    });
    return _transporter;
  }

  if (env.smtpHost && env.smtpUser && env.smtpPass) {
    console.log(`[Email] Using SMTP: ${env.smtpHost}:${env.smtpPort}`);
    _transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
    return _transporter;
  }

  console.error('[Email] Gmail SMTP credentials are missing. Set EMAIL_USER and EMAIL_PASS in .env.');
  throw new Error('Email service unavailable. Missing SMTP credentials.');
}

export async function sendReceiptEmail(toEmail, orderNumber, receiptHtml) {
  const transporter = await getTransporter();

  const mailOptions = {
    from: env.smtpFrom,
    to: toEmail,
    subject: `Your receipt for Order #${orderNumber} — ${APP_NAME}`,
    html: receiptHtml,
    text: `Your receipt for Order #${orderNumber} is attached.\n\nThank you for dining with us!`,
  };

  console.log(`[Email] Sending via Gmail SMTP to: ${toEmail} (Order #${orderNumber})`);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] ✅ Email sent via Gmail to: ${toEmail} (Message ID: ${info.messageId})`);
    return { messageId: info.messageId };
  } catch (err) {
    const invalidLogin = err.code === 'EAUTH' || /invalid login/i.test(err.message || '');
    if (invalidLogin) {
      console.error('[Email] ❌ Gmail send failed: Invalid login. Check EMAIL_USER, EMAIL_PASS, and ensure Gmail App Password is configured with 2-Step Verification enabled.');
    } else {
      console.error(`[Email] ❌ Gmail send failed: ${err.message}`);
    }
    throw err;
  }
}
