import mongoose from 'mongoose';

const pageViewSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  visitorId: { type: String, required: true },
  path: { type: String, required: true },
  referrer: { type: String, default: '' },
  utmSource: { type: String, default: '' },
  utmMedium: { type: String, default: '' },
  utmCampaign: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  device: {
    type: { type: String, default: 'desktop' },
    browser: { type: String, default: '' },
    os: { type: String, default: '' },
  },
  ip: { type: String, default: '' },
  screenWidth: { type: Number },
  screenHeight: { type: Number },
  duration: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});

// TTL — auto-delete after 1 year
pageViewSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Query indexes
pageViewSchema.index({ sessionId: 1, timestamp: -1 });
pageViewSchema.index({ visitorId: 1, timestamp: -1 });
pageViewSchema.index({ path: 1, timestamp: -1 });

export default mongoose.model('PageView', pageViewSchema);
