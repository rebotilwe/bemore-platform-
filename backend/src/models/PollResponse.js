import mongoose from 'mongoose';

const pollResponseSchema = new mongoose.Schema({
  pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sessionId: { type: String, required: true },
  optionId: { type: mongoose.Schema.Types.ObjectId },
  textResponse: { type: String, maxlength: 200 },
  ratingValue: { type: Number, min: 1, max: 10 },
  engagementSource: { type: String, default: 'mentee-meter' },
  ip: String,
  timestamp: { type: Date, default: Date.now },
});

// One vote per session per question
pollResponseSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });
// Fast aggregation
pollResponseSchema.index({ pollId: 1, questionId: 1 });
pollResponseSchema.index({ timestamp: -1 });

export default mongoose.model('PollResponse', pollResponseSchema);
