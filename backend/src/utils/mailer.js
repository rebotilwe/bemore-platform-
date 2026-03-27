import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter = null;

function getTransporter() {
  if (!transporter && config.mail.host) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.port === 465,
      auth: { user: config.mail.user, pass: config.mail.pass },
    });
  }
  return transporter;
}

const STATUS_MESSAGES = {
  reviewing: {
    subject: 'Application Under Review',
    heading: 'Your Application is Being Reviewed',
    body: 'Our team is currently reviewing your profile against our merit-based criteria. We will be in touch with an update within <strong>5 business days</strong>.',
  },
  shortlisted: {
    subject: 'You Have Been Shortlisted!',
    heading: 'Congratulations — You\'re Shortlisted',
    body: 'We are pleased to inform you that your application has been <strong>shortlisted</strong> for the BeMore SME Access Initiative. Our deal room team will review your profile for potential funder matching.',
  },
  invited: {
    subject: 'Summit Invitation — BeMore 2026',
    heading: 'You\'re Invited to the BeMore Summit',
    body: 'You have been formally <strong>invited</strong> to the BeMore SME Access Initiative Summit. Please save the date and watch for your personal invitation with full event details.',
  },
  funded: {
    subject: 'Funding Confirmed — BeMore',
    heading: 'Funding Partnership Confirmed',
    body: 'We are delighted to confirm that your application has been matched with a <strong>funding partnership</strong> through the BeMore programme. Our team will be in touch with next steps.',
  },
};

export async function sendSubmissionConfirmation(to, refNumber, firstName) {
  const t = getTransporter();
  if (!t) return;

  try {
    await t.sendMail({
      from: `"BeMore Group" <${config.mail.from}>`,
      to,
      subject: `Application Received — ${refNumber}`,
      html: buildEmail(firstName, refNumber, 'Application Received',
        'Thank you for submitting your application to the BeMore SME Access Initiative. Our team will review your profile against our merit-based criteria and be in touch within <strong>5 business days</strong>.'),
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

export async function sendStatusNotification(to, refNumber, firstName, newStatus) {
  const t = getTransporter();
  if (!t) return;

  const msg = STATUS_MESSAGES[newStatus];
  if (!msg) return; // Don't email for 'new' status

  try {
    await t.sendMail({
      from: `"BeMore Group" <${config.mail.from}>`,
      to,
      subject: `${msg.subject} — ${refNumber}`,
      html: buildEmail(firstName, refNumber, msg.heading, msg.body),
    });
  } catch (err) {
    console.error('Status email failed:', err.message);
  }
}

function buildEmail(firstName, refNumber, heading, bodyHtml) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
      <div style="background:#0a0a0f;padding:32px;text-align:center">
        <h1 style="color:#c9a84c;margin:0;font-size:28px">BeMore</h1>
        <p style="color:#b4b4c4;margin:8px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase">
          Deal Accelerator
        </p>
      </div>
      <div style="padding:32px;background:#f9f5ee">
        <h2 style="color:#0a0a0f;margin:0 0 16px">${heading}</h2>
        <p>Dear ${firstName},</p>
        <p>${bodyHtml}</p>
        <div style="background:#fff;border:1px solid #e0d9c8;border-radius:8px;padding:20px;margin:24px 0;text-align:center">
          <p style="color:#8a8a9a;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">
            Reference Number
          </p>
          <p style="font-size:24px;font-weight:700;color:#0a0a0f;margin:0;letter-spacing:2px">${refNumber}</p>
        </div>
        <div style="background:#0a0a0f;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
          <p style="color:#c9a84c;font-size:14px;font-weight:600;letter-spacing:1px;margin:0 0 4px">
            BeMore Summit 2026
          </p>
          <p style="color:#b4b4c4;margin:0;font-size:13px">
            30 &ndash; 31 March 2026 &middot; Sandton Convention Centre
          </p>
        </div>
        <p style="color:#8a8a9a;font-size:12px;margin-top:32px">
          Please retain your reference number for future correspondence.<br>
          If you have any questions, reply to this email.
        </p>
      </div>
    </div>`;
}
