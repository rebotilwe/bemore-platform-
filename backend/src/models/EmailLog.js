import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
  to: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  template: { type: String, required: true }, // submission_confirmation, status_notification, summit_reminder
  refNumber: { type: String, index: true },
  status: { type: String, enum: ['sent', 'failed'], required: true },
  error: String,
  sentAt: { type: Date, default: Date.now },
});

emailLogSchema.index({ sentAt: -1 });
emailLogSchema.index({ refNumber: 1, sentAt: -1 });

export default mongoose.model('EmailLog', emailLogSchema);
