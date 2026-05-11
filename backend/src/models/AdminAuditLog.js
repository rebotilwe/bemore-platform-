/**
 * AdminAuditLog Model — FICA Compliance
 *
 * Tracks all admin actions for audit purposes.
 * Retention: 7 years (FICA requirement)
 * Bukani Tech Standard: "Audit Logs: 7 years retention (FICA)"
 */
import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema({
  // Who performed the action
  admin: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },  // Optional for failed login attempts
    email: { type: String, required: true },
  },

  // What action was performed
  action: {
    type: String,
    enum: [
      'login', 'logout', 'login_failed',
      'status_update', 'bulk_status_update',
      'data_export', 'data_delete',
      'email_reminder_sent', 'bulk_email_sent',
      'settings_update',
      'report_generated',
      'poll_create', 'poll_update', 'poll_delete', 'poll_activate',
      'application_view', 'lead_classify',
      // Attachment actions (spec §8.3, §8.4, §8.5)
      'attachment.download', 'attachment.delete', 'attachment.signed-download',
    ],
    required: true,
    index: true,
  },

  // Target of the action
  target: {
    model: String, // 'Application', 'Poll', 'SiteSettings', etc.
    id: mongoose.Schema.Types.ObjectId,
    refNumber: String,
  },

  // Additional context
  details: mongoose.Schema.Types.Mixed,

  // Request context for tracing
  ip: String,
  userAgent: String,
  requestId: String,

  // Outcome
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success',
  },
  errorMessage: String,

  timestamp: { type: Date, default: Date.now },
});

// TTL index — auto-delete after 7 years (FICA compliance)
// 7 years = 2556.75 days ≈ 220903200 seconds
adminAuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 220903200 });

// Compound indexes for common queries
adminAuditLogSchema.index({ admin: 1, timestamp: -1 });
adminAuditLogSchema.index({ action: 1, timestamp: -1 });
adminAuditLogSchema.index({ timestamp: -1 });

export default mongoose.model('AdminAuditLog', adminAuditLogSchema);
