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

export async function sendSubmissionConfirmation(to, refNumber, firstName) {
  const t = getTransporter();
  if (!t) return; // SMTP not configured — skip silently

  try {
    await t.sendMail({
      from: `"BeMore Group" <${config.mail.from}>`,
      to,
      subject: `Application Received — ${refNumber}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
          <div style="background:#0a0a0f;padding:32px;text-align:center">
            <h1 style="color:#c9a84c;margin:0;font-size:28px">BeMore</h1>
            <p style="color:#b4b4c4;margin:8px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase">
              Deal Accelerator
            </p>
          </div>
          <div style="padding:32px;background:#f9f5ee">
            <h2 style="color:#0a0a0f;margin:0 0 16px">Application Received</h2>
            <p>Dear ${firstName},</p>
            <p>
              Thank you for submitting your application to the BeMore SME Access Initiative.
              Our team will review your profile against our merit-based criteria and be in
              touch within <strong>5 business days</strong>.
            </p>
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
              <p style="color:#c9a84c;margin:8px 0 0;font-size:12px;font-style:italic">
                Shortlisted applicants will receive personal invitations
              </p>
            </div>
            <p style="color:#8a8a9a;font-size:12px;margin-top:32px">
              Please retain your reference number for future correspondence.<br>
              If you have any questions, reply to this email.
            </p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}
