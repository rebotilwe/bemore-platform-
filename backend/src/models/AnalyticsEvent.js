import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema({
  event: { type: String, required: true, index: true },
  category: {
    type: String,
    enum: ['application', 'admin', 'auth', 'report', 'system', 'poll'],
    required: true,
    index: true,
  },
  actor: {
    type: { type: String, enum: ['applicant', 'admin', 'system'], default: 'system' },
    id: String,
    email: String,
  },
  target: {
    model: String,
    id: String,
    refNumber: String,
  },
  meta: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
});

// TTL index — auto-delete events older than 1 year
analyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Compound indexes for common queries
analyticsEventSchema.index({ category: 1, timestamp: -1 });
analyticsEventSchema.index({ event: 1, timestamp: -1 });

export default mongoose.model('AnalyticsEvent', analyticsEventSchema);
