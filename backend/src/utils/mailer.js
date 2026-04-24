import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../config/index.js';
import logger from './logger.js';
import { redactEmail } from './redactPII.js';
import EmailLog from '../models/EmailLog.js';

const PLATFORM_URL = process.env.PLATFORM_URL || 'https://bemore-tawny.vercel.app';

function logEmail(to, subject, template, refNumber, status, error) {
  EmailLog.create({ to: redactEmail(to), subject, template, refNumber, status, error: error || undefined })
    .catch(err => logger.error(`EmailLog write failed: ${err.message}`));
}

// ══════════════════════════════════════════════════════════════
//  RESEND CONFIGURATION
// ══════════════════════════════════════════════════════
let resendClient = null;

function getResendClient() {
  if (!resendClient && config.mail.resendApiKey) {
    resendClient = new Resend(config.mail.resendApiKey);
    logger.info(`Resend client initialized`);
  }
  return resendClient;
}

// ══════════════════════════════════════════════════════
//  SMTP CONFIGURATION (legacy fallback)
// ══════════════════════════════════════════════════════════════
let transporter = null;

function getTransporter() {
  if (!transporter && config.mail.host) {
    if (!config.mail.user || !config.mail.pass) {
      logger.warn('SMTP credentials missing — emails will not be sent. Set SMTP_USER and SMTP_PASS env vars.');
      return null;
    }
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.port === 465,
      auth: { user: config.mail.user, pass: config.mail.pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      tls: { rejectUnauthorized: false },
    });
    logger.info(`Mail transporter created: ${config.mail.host}:${config.mail.port} (user: ${redactEmail(config.mail.user || '')})`);

    // Verify connection on startup (non-blocking)
    transporter.verify().then(() => {
      logger.info('SMTP connection verified — emails ready');
    }).catch(err => {
      logger.error(`SMTP verification failed: ${err.code || err.message}. Emails may not send.`);
    });
  }
  return transporter;
}

function fromAddress() {
  // Sanitize fromName to prevent email header injection (strip CR/LF)
  const safeName = (config.mail.fromName || 'BeMore').replace(/[\r\n\t]/g, '');
  return `"${safeName}" <${config.mail.from}>`;
}

// ══════════════════════════════════════════════════════════════
//  EMAIL SEND WRAPPER (Resend with SMTP fallback)
// ══════════════════════════════════════════════════════════════
async function sendEmail({ to, subject, html, text }) {
  const resend = getResendClient();
  const transporter = getTransporter();

  // Try Resend first if API key is configured
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: config.mail.fromName && config.mail.from
          ? `${config.mail.fromName} <${config.mail.from}>`
          : 'BeMore <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      });

      if (error) {
        logger.error(`Resend error: ${JSON.stringify(error)}`);
        // Fall through to try SMTP
      } else {
        logger.info(`Email sent via Resend: ${data?.id}`);
        return { success: true, provider: 'resend', id: data?.id };
      }
    } catch (err) {
      logger.error(`Resend exception: ${err.message}`);
    }
  }

  // Fallback to SMTP
  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress(),
        to,
        subject,
        html,
        text,
      });
      logger.info(`Email sent via SMTP`);
      return { success: true, provider: 'smtp' };
    } catch (err) {
      logger.error(`SMTP send failed: ${err.message}`);
      return { success: false, error: err.message, provider: 'smtp' };
    }
  }

  // Neither provider available
  logger.error('No email provider configured (neither Resend nor SMTP available)');
  return { success: false, error: 'No email provider configured' };
}

// ══════════════════════════════════════════════════════════════
//  1. SUBMISSION CONFIRMATION
// ══════════════════════════════════════════════════════════════
export async function sendSubmissionConfirmation(to, refNumber, firstName) {
  const html = buildEmail(firstName, refNumber, 'Application Received', `
    Thank you for submitting your application to the <strong>BeMore SME Access Initiative</strong>.
    <br><br>
    Our team will review your profile against our merit-based criteria and be in touch within <strong>5 business days</strong>.
    <br><br>
    You can check your application status at any time using the link below.
  `, [
    { label: 'Check My Status', url: `${PLATFORM_URL}/#/status` },
  ]);

  const result = await sendEmail({
    to,
    subject: `Application Received — ${refNumber}`,
    html,
  });

  logEmail(to, `Application Received — ${refNumber}`, 'submission_confirmation', refNumber, result.success ? 'sent' : 'failed', result.error);
  if (result.success) {
    logger.info(`Submission confirmation sent to ${redactEmail(to)} (${refNumber})`);
  }
}

// ══════════════════════════════════════════════════════════════
//  2. STATUS CHANGE NOTIFICATIONS
// ══════════════════════════════════════════════════════════════
const STATUS_MESSAGES = {
  reviewing: {
    subject: 'Application Under Review',
    heading: 'Your Application is Being Reviewed',
    body: `
      Our team is currently reviewing your profile against our merit-based criteria.
      We will be in touch with an update within <strong>5 business days</strong>.
      <br><br>
      In the meantime, you can track your progress using the status link below.
    `,
  },
  shortlisted: {
    subject: 'You Have Been Shortlisted!',
    heading: 'Congratulations &mdash; You\'re Shortlisted',
    body: `
      We are pleased to inform you that your application has been <strong>shortlisted</strong>
      for the BeMore SME Access Initiative.
      <br><br>
      Our deal room team will review your profile for potential funding partner alignment
      with <strong>PBSA</strong> and our institutional funding partners.
      <br><br>
      You will be contacted with next steps shortly.
    `,
  },
  invited: {
    subject: 'You\'re Invited — BeMore SME Access Initiative',
    heading: 'You\'re Invited',
    body: `
      You have been formally <strong>invited</strong> to participate in the BeMore SME Access Initiative.
      <br><br>
      Our team will be in touch with full details and next steps.
      <br><br>
      Please confirm your attendance by replying to this email.
    `,
  },
  funded: {
    subject: 'Funding Partnership Confirmed — BeMore',
    heading: 'Funding Partnership Confirmed',
    body: `
      We are delighted to confirm that your application has been matched with a
      <strong>funding partnership</strong> through the BeMore programme.
      <br><br>
      Our team will be in touch with the detailed terms, next steps, and onboarding process.
      <br><br>
      Congratulations on this milestone.
    `,
  },
};

export async function sendStatusNotification(to, refNumber, firstName, newStatus) {
  const msg = STATUS_MESSAGES[newStatus];
  if (!msg) return;

  const html = buildEmail(firstName, refNumber, msg.heading, msg.body, [
    { label: 'Check My Status', url: `${PLATFORM_URL}/#/status` },
  ]);

  const result = await sendEmail({
    to,
    subject: `${msg.subject} — ${refNumber}`,
    html,
  });

  logEmail(to, `${msg.subject} — ${refNumber}`, 'status_notification', refNumber, result.success ? 'sent' : 'failed', result.error);
  if (result.success) {
    logger.info(`Status notification (${newStatus}) sent to ${redactEmail(to)} (${refNumber})`);
  }
}

// ══════════════════════════════════════════════════════════════
//  3. REMINDER (callable from admin)
// ══════════════════════════════════════════════════════
export async function sendSummitReminder(to, refNumber, firstName) {
  const html = buildEmail(firstName, refNumber, 'Reminder', `
    This is a friendly reminder about your application to the <strong>BeMore SME Access Initiative</strong>.
    <br><br>
    Please check your application status using the link below, and don't hesitate to reach out if you have any questions.
    <br><br>
    We look forward to engaging with you!
  `, [
    { label: 'Check My Status', url: `${PLATFORM_URL}/#/status` },
    { label: 'View Platform', url: PLATFORM_URL },
  ]);

  const result = await sendEmail({
    to,
    subject: `Reminder — BeMore SME Access Initiative (${refNumber})`,
    html,
  });

  logEmail(to, `Reminder — BeMore (${refNumber})`, 'reminder', refNumber, result.success ? 'sent' : 'failed', result.error);
  if (result.success) {
    logger.info(`Reminder sent to ${redactEmail(to)} (${refNumber})`);
  }
}

// ══════════════════════════════════════════════════════════════
//  HTML EMAIL TEMPLATE
// ══════════════════════════════════════════════════════════════
function buildEmail(firstName, refNumber, heading, bodyHtml, buttons = []) {
  const buttonHtml = buttons.length
    ? `<div style="text-align:center;margin:24px 0">
        ${buttons.map(b => `
          <a href="${b.url}" style="display:inline-block;padding:12px 28px;margin:0 6px 8px;background:#c9a84c;color:#0a0a0f;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;letter-spacing:0.5px">${b.label}</a>
        `).join('')}
       </div>`
    : '';

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#333;background:#ffffff">
      <!-- Header -->
      <div style="background:#0a0a0f;padding:32px;text-align:center">
        <img src="${PLATFORM_URL}/be-more-group-logo.png" alt="BeMore Group" width="120" height="149" style="display:inline-block;max-width:120px;height:auto" />
        <p style="color:#b4b4c4;margin:12px 0 0;font-size:12px;letter-spacing:3px;text-transform:uppercase">
          SME Access Initiative
        </p>
      </div>

      <!-- Co-branding bar -->
      <div style="background:#14141f;padding:12px 32px;text-align:center;border-bottom:2px solid #c9a84c">
        <span style="color:#e8c97a;font-size:12px;letter-spacing:2px;text-transform:uppercase">BeMore &times; PBSA</span>
        <span style="color:#666;font-size:12px;margin:0 8px">&mdash;</span>
        <span style="color:#999;font-size:11px;letter-spacing:1px">Institutional Funding Partnership</span>
      </div>

      <!-- Body -->
      <div style="padding:32px;background:#f9f5ee">
        <h2 style="color:#0a0a0f;margin:0 0 16px;font-size:22px">${heading}</h2>
        <p style="font-size:15px;line-height:1.6;color:#333">Dear ${firstName},</p>
        <div style="font-size:15px;line-height:1.7;color:#333">${bodyHtml}</div>

        <!-- Reference Number -->
        <div style="background:#ffffff;border:1px solid #e0d9c8;border-radius:8px;padding:20px;margin:24px 0;text-align:center">
          <p style="color:#8a8a9a;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">
            Your Reference Number
          </p>
          <p style="font-size:24px;font-weight:700;color:#0a0a0f;margin:0;letter-spacing:3px;font-family:'Courier New',monospace">${refNumber}</p>
        </div>

        <!-- CTA Buttons -->
        ${buttonHtml}

        <!-- Footer note -->
        <p style="color:#8a8a9a;font-size:12px;margin-top:32px;line-height:1.6">
          Please retain your reference number for future correspondence.<br>
          If you have any questions, reply to this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#0a0a0f;padding:20px 32px;text-align:center">
        <p style="color:#666;font-size:11px;margin:0;line-height:1.6">
          BeMore Group (Pty) Ltd &times; PBSA<br>
          Sandton, Gauteng, South Africa<br>
          <a href="${PLATFORM_URL}" style="color:#c9a84c;text-decoration:none">bemore-tawny.vercel.app</a>
        </p>
      </div>
    </div>`;
}