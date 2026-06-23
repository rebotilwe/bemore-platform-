import { Resend } from 'resend';
import { config } from '../config/index.js';
import logger from './logger.js';
import { redactEmail } from './redactPII.js';
import EmailLog from '../models/EmailLog.js';
import { getDepartmentEmail, getDepartmentName } from '../constants/routing.js';

const PLATFORM_URL = process.env.PLATFORM_URL || 'https://bemore-tawny.vercel.app';

function logEmail(to, subject, template, refNumber, status, error) {
  EmailLog.create({ to: redactEmail(to), subject, template, refNumber, status, error: error || undefined })
    .catch(err => logger.error(`EmailLog write failed: ${err.message}`));
}

// ══════════════════════════════════════════════════════════════
//  RESEND CLIENT (sole email provider — SMTP removed 2026-05-11)
// ══════════════════════════════════════════════════════════════
let resendClient = null;

function getResendClient() {
  if (!resendClient && config.mail.resendApiKey) {
    resendClient = new Resend(config.mail.resendApiKey);
    logger.info('Resend client initialized');
  }
  return resendClient;
}

// ══════════════════════════════════════════════════════════════
//  EMAIL SEND WRAPPER
// ══════════════════════════════════════════════════════════════
async function sendEmail({ to, subject, html, text }) {
  const resend = getResendClient();
  if (!resend) {
    logger.error('Email send aborted — RESEND_API_KEY not configured');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  // Sanitize fromName to prevent header injection (strip CR/LF/tab).
  const safeName = (config.mail.fromName || 'BeMore').replace(/[\r\n\t]/g, '');
  const fromAddress = config.mail.from
    ? `${safeName} <${config.mail.from}>`
    : `${safeName} <onboarding@resend.dev>`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });

    if (error) {
      logger.error(`Resend error: ${JSON.stringify(error)}`);
      return { success: false, error: error.message || JSON.stringify(error), provider: 'resend' };
    }

    logger.info(`Email sent via Resend: ${data?.id}`);
    return { success: true, provider: 'resend', id: data?.id };
  } catch (err) {
    logger.error(`Resend exception: ${err.message}`);
    return { success: false, error: err.message, provider: 'resend' };
  }
}

// ══════════════════════════════════════════════════════════════
//  HTML EMAIL TEMPLATE
// ══════════════════════════════════════════════════════════════
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmail(firstName, refNumber, heading, bodyHtml, buttons = []) {
  const safeFirstName = escapeHtml(firstName);
  const safeRefNumber = escapeHtml(refNumber);

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

      <!-- Co-branding bar (can be removed when PBSA branding is removed) -->
      <div style="background:#14141f;padding:12px 32px;text-align:center;border-bottom:2px solid #c9a84c">
        <span style="color:#e8c97a;font-size:12px;letter-spacing:2px;text-transform:uppercase">BeMore</span>
        <span style="color:#666;font-size:12px;margin:0 8px">&mdash;</span>
        <span style="color:#999;font-size:11px;letter-spacing:1px">Institutional Funding Partnership</span>
      </div>

      <!-- Body -->
      <div style="padding:32px;background:#f9f5ee">
        <h2 style="color:#0a0a0f;margin:0 0 16px;font-size:22px">${heading}</h2>
        <p style="font-size:15px;line-height:1.6;color:#333">Dear ${safeFirstName},</p>
        <div style="font-size:15px;line-height:1.7;color:#333">${bodyHtml}</div>

        <!-- Reference Number -->
        <div style="background:#ffffff;border:1px solid #e0d9c8;border-radius:8px;padding:20px;margin:24px 0;text-align:center">
          <p style="color:#8a8a9a;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">
            Your Reference Number
          </p>
          <p style="font-size:24px;font-weight:700;color:#0a0a0f;margin:0;letter-spacing:3px;font-family:'Courier New',monospace">${safeRefNumber}</p>
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
          BeMore Group (Pty) Ltd<br>
          Sandton, Gauteng, South Africa<br>
          <a href="${PLATFORM_URL}" style="color:#c9a84c;text-decoration:none">bemore-tawny.vercel.app</a>
        </p>
      </div>
    </div>`;
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
  return result;
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
      with our institutional funding partners.
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
  if (!msg) return { success: false, error: 'Invalid status' };

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
  return result;
}

// ══════════════════════════════════════════════════════════════
//  3. POPIA — Data Export Receipt
// ══════════════════════════════════════════════════════════════
export async function sendDataExportReceipt(to, refNumber, firstName) {
  const requestedAt = new Date().toUTCString();
  const html = buildEmail(firstName, refNumber, 'Data Export Confirmed', `
    We have processed your POPIA data export request for application <strong>${refNumber}</strong>.
    A copy of your data was returned to your browser at the time of the request.
    <br><br>
    <strong>Request timestamp:</strong> ${requestedAt}
    <br><br>
    If you did not make this request, please contact us immediately at
    <a href="mailto:hello@bemorecapital.co.za" style="color:#c9a84c">hello@bemorecapital.co.za</a>.
  `, [
    { label: 'Check My Status', url: `${PLATFORM_URL}/#/status` },
  ]);

  const result = await sendEmail({
    to,
    subject: `POPIA Data Export Confirmed — ${refNumber}`,
    html,
  });

  logEmail(to, `POPIA Data Export Confirmed — ${refNumber}`, 'data_export_receipt', refNumber, result.success ? 'sent' : 'failed', result.error);
  if (result.success) {
    logger.info(`Data export receipt sent to ${redactEmail(to)} (${refNumber})`);
  }
  return result;
}

// ══════════════════════════════════════════════════════════════
//  4. POPIA — Data Delete Receipt
// ══════════════════════════════════════════════════════════════
export async function sendDataDeleteReceipt(to, refNumber, firstName) {
  const deletedAt = new Date().toUTCString();
  const html = buildEmail(firstName, refNumber, 'Data Deletion Confirmed', `
    We have permanently deleted all personal and project-related information
    associated with application <strong>${refNumber}</strong> from our records,
    in accordance with the <strong>Protection of Personal Information Act (POPIA)</strong>.
    <br><br>
    <strong>Deletion timestamp:</strong> ${deletedAt}
    <br><br>
    This action cannot be reversed. Should you wish to engage with the BeMore
    SME Access Initiative again, you are welcome to submit a new application.
    <br><br>
    If you did not request this deletion, please contact us immediately at
    <a href="mailto:hello@bemorecapital.co.za" style="color:#c9a84c">hello@bemorecapital.co.za</a>.
  `);

  const result = await sendEmail({
    to,
    subject: `POPIA Data Deletion Confirmed — ${refNumber}`,
    html,
  });

  logEmail(to, `POPIA Data Deletion Confirmed — ${refNumber}`, 'data_delete_receipt', refNumber, result.success ? 'sent' : 'failed', result.error);
  if (result.success) {
    logger.info(`Data delete receipt sent to ${redactEmail(to)} (${refNumber})`);
  }
  return result;
}

// ══════════════════════════════════════════════════════════════
//  5. REMINDER (callable from admin)
// ══════════════════════════════════════════════════════════════
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
  return result;
}

// ══════════════════════════════════════════════════════════════
//  6. DEPARTMENT NOTIFICATION (NEW)
// ══════════════════════════════════════════════════════════════
export async function sendDepartmentNotification(application) {
  const { refNumber, personal, userType, routing, formData, attachments } = application;
  
  const department = routing?.department || 'unassigned';
  const to = getDepartmentEmail(department);
  const departmentName = getDepartmentName(department);
  const leadType = routing?.leadType || 'General';
  const priority = routing?.priority || 'Medium';
  
  // Build department-specific body
  let bodyHtml = `
    <p><strong>Reference:</strong> ${escapeHtml(refNumber)}</p>
    <p><strong>Applicant:</strong> ${escapeHtml(personal?.firstName || '')} ${escapeHtml(personal?.surname || '')}</p>
    <p><strong>Email:</strong> ${escapeHtml(personal?.email || '')}</p>
    <p><strong>Phone:</strong> ${escapeHtml(personal?.phone || '')}</p>
    <p><strong>User Type:</strong> ${escapeHtml(userType)}</p>
    <p><strong>Lead Type:</strong> ${escapeHtml(leadType)}</p>
    <p><strong>Priority:</strong> ${escapeHtml(priority)}</p>
  `;

  // Add department-specific context
  if (userType === 'landowner' && formData?.landOutcome) {
    bodyHtml += `<p><strong>Land Outcome:</strong> ${escapeHtml(formData.landOutcome)}</p>`;
  }
  if (userType === 'landowner' && formData?.landLocation) {
    bodyHtml += `<p><strong>Land Location:</strong> ${escapeHtml(formData.landLocation)}</p>`;
  }
  if (userType === 'landowner' && formData?.landSize) {
    bodyHtml += `<p><strong>Land Size:</strong> ${escapeHtml(formData.landSize)}</p>`;
  }
  if (userType === 'student' && formData?.portfolioSize) {
    bodyHtml += `<p><strong>Portfolio Size:</strong> ${escapeHtml(formData.portfolioSize)}</p>`;
  }
  if (userType === 'student' && formData?.portfolioLocations) {
    bodyHtml += `<p><strong>Locations:</strong> ${escapeHtml(Array.isArray(formData.portfolioLocations) ? formData.portfolioLocations.join(', ') : formData.portfolioLocations)}</p>`;
  }
  if (userType === 'professional') {
    // Check if documents were uploaded
    const docFields = ['company_registration', 'tax_clearance', 'bee_certificate', 'professional_indemnity'];
    const uploadedDocs = attachments?.filter(a => docFields.includes(a.field)) || [];
    const hasDocs = uploadedDocs.length > 0;
    bodyHtml += `<p><strong>Documents Uploaded:</strong> ${hasDocs ? `✅ Yes (${uploadedDocs.length}/4)` : '⚠️ Pending'}</p>`;
    if (hasDocs) {
      bodyHtml += `<ul style="margin-top:4px;font-size:13px;color:#555">`;
      for (const doc of docFields) {
        const uploaded = uploadedDocs.find(a => a.field === doc);
        bodyHtml += `<li>${doc.replace(/_/g, ' ').toUpperCase()}: ${uploaded ? '✅' : '❌'}</li>`;
      }
      bodyHtml += `</ul>`;
    }
  }
  if (userType === 'developer' && formData?.portfolioSize) {
    bodyHtml += `<p><strong>Portfolio Size:</strong> ${escapeHtml(formData.portfolioSize)}</p>`;
  }
  if (userType === 'aspiring' && formData?.equityAmount) {
    bodyHtml += `<p><strong>Equity Available:</strong> ${escapeHtml(formData.equityAmount)}</p>`;
  }

  const html = buildEmail(
    'Team',
    refNumber,
    `New ${departmentName} Lead`,
    `
      <p>A new application has been routed to your department.</p>
      ${bodyHtml}
      <p><strong>Action Required:</strong> Review this lead and follow up with the applicant.</p>
    `,
    [
      { label: 'View in Admin', url: `${PLATFORM_URL}/admin/leads/${refNumber}` },
      { label: 'View All Leads', url: `${PLATFORM_URL}/admin/leads` },
    ]
  );

  // Use the department email or fallback to admin
  const recipient = to || process.env.ADMIN_EMAIL || 'admin@bemore.co.za';

  // Only send if we have a valid recipient
  if (!recipient || recipient === 'undefined' || recipient === 'unassigned') {
    logger.warn(`Department notification skipped - no email configured for ${department}`);
    return { success: false, error: 'No department email configured' };
  }

  const result = await sendEmail({
    to: recipient,
    subject: `New ${departmentName} Lead — ${refNumber}`,
    html,
  });

  logEmail(
    recipient, 
    `New ${departmentName} Lead — ${refNumber}`, 
    'department_notification', 
    refNumber, 
    result.success ? 'sent' : 'failed', 
    result.error
  );
  
  if (result.success) {
    logger.info(`Department notification sent to ${redactEmail(recipient)} (${refNumber})`);
  } else {
    logger.error(`Department notification failed for ${refNumber}: ${result.error}`);
  }
  
  return result;
}

// ══════════════════════════════════════════════════════════════
//  7. DOCUMENT EXPIRY NOTIFICATION (NEW)
// ══════════════════════════════════════════════════════════════
export async function sendDocumentExpiryNotification(application, expiringDocs) {
  const { refNumber, personal, attachments } = application;
  
  if (!personal?.email) {
    logger.warn(`Document expiry notification skipped - no email for ${refNumber}`);
    return { success: false, error: 'No email address' };
  }

  // Find the document labels
  const docLabelMap = {
    company_registration: 'Company Registration',
    tax_clearance: 'Tax Clearance Certificate',
    bee_certificate: 'B-BBEE Certificate',
    professional_indemnity: 'Professional Indemnity Insurance',
  };

  const docList = expiringDocs.map(doc => {
    const label = docLabelMap[doc.field] || doc.field;
    const daysUntil = doc.daysUntilExpiry !== undefined ? doc.daysUntilExpiry : 
      Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return `<li>${label}: Expires ${new Date(doc.expiryDate).toLocaleDateString()} (${daysUntil} days)</li>`;
  }).join('');

  const html = buildEmail(
    personal.firstName || 'Valued Professional',
    refNumber,
    'Document Expiry Reminder',
    `
      <p>Some of your documents on the BeMore platform are approaching their expiry dates.</p>
      <ul style="color:#333;font-size:14px;line-height:1.8">${docList}</ul>
      <p>Please upload updated versions to ensure your profile remains active and you continue to be considered for project opportunities.</p>
      <p style="font-size:13px;color:#666;margin-top:12px">If you've already submitted updated documents, please disregard this notice.</p>
    `,
    [
      { label: 'Update Documents', url: `${PLATFORM_URL}/admin/leads/${refNumber}` },
      { label: 'View My Profile', url: `${PLATFORM_URL}/#/status` },
    ]
  );

  const result = await sendEmail({
    to: personal.email,
    subject: `Document Expiry Reminder — ${refNumber}`,
    html,
  });

  logEmail(
    personal.email, 
    `Document Expiry Reminder — ${refNumber}`, 
    'document_expiry', 
    refNumber, 
    result.success ? 'sent' : 'failed', 
    result.error
  );
  
  if (result.success) {
    logger.info(`Document expiry notification sent to ${redactEmail(personal.email)} (${refNumber})`);
  }
  
  return result;
}

// ══════════════════════════════════════════════════════════════
//  8. BULK DEPARTMENT NOTIFICATION (NEW)
// ══════════════════════════════════════════════════════════════
export async function sendBulkDepartmentNotifications(applications) {
  const results = [];
  
  for (const app of applications) {
    try {
      const result = await sendDepartmentNotification(app);
      results.push({ refNumber: app.refNumber, success: result.success, error: result.error });
    } catch (err) {
      logger.error(`Bulk department notification failed for ${app.refNumber}: ${err.message}`);
      results.push({ refNumber: app.refNumber, success: false, error: err.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  logger.info(`Bulk department notifications: ${successCount}/${results.length} sent`);
  
  return results;
}

// ══════════════════════════════════════════════════════════════
//  9. CHECK EXPIRING DOCUMENTS (NEW - For Scheduled Jobs)
// ══════════════════════════════════════════════════════════════
export async function checkExpiringDocuments() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  // Find applications with attachments that are expiring soon
  const applications = await Application.find({
    'attachments.expiryDate': { 
      $gte: new Date(), 
      $lte: thirtyDaysFromNow 
    },
    'personal.email': { $exists: true, $ne: '' }
  }).select('refNumber personal attachments');
  
  const notifications = [];
  
  for (const app of applications) {
    const expiringDocs = app.attachments
      .filter(a => a.expiryDate && new Date(a.expiryDate) <= thirtyDaysFromNow && new Date(a.expiryDate) >= new Date())
      .map(a => ({
        field: a.field,
        expiryDate: a.expiryDate,
        daysUntilExpiry: Math.ceil((new Date(a.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        label: a.field.replace(/_/g, ' ').toUpperCase(),
      }));
    
    if (expiringDocs.length > 0) {
      // Check if we should send notification (only if within 7 days or already expired)
      const urgentDocs = expiringDocs.filter(d => d.daysUntilExpiry <= 7);
      if (urgentDocs.length > 0) {
        await sendDocumentExpiryNotification(app, urgentDocs);
        notifications.push({ refNumber: app.refNumber, docs: urgentDocs.length });
      }
    }
  }
  
  logger.info(`Document expiry check completed: ${notifications.length} notifications sent`);
  return notifications;
}

// ══════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════
export { 
  sendEmail, 
  buildEmail, 
  escapeHtml,
  logEmail 
};