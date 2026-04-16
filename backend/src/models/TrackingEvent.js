import mongoose from 'mongoose';

const trackingEventSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  visitorId: { type: String, required: true },
  category: {
    type: String,
    enum: ['click', 'form_funnel', 'interaction', 'scroll', 'download'],
    required: true,
  },
  action: { type: String, required: true },
  label: { type: String, default: '' },
  value: { type: Number, default: 0 },
  path: { type: String, default: '' },
  meta: mongoose.Schema.Types.Mixed,
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

// TTL — auto-delete after 1 year
trackingEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Query indexes
trackingEventSchema.index({ category: 1, timestamp: -1 });
trackingEventSchema.index({ action: 1, timestamp: -1 });
trackingEventSchema.index({ sessionId: 1 });

export default mongoose.model('TrackingEvent', trackingEventSchema);
