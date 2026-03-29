import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 100 },
  color: { type: String, default: '#c9a84c' },
});

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 500 },
  type: {
    type: String,
    enum: ['multiple-choice', 'word-cloud', 'rating', 'open-text'],
    required: true,
  },
  options: [optionSchema],
  settings: {
    maxSelections: { type: Number, default: 1, min: 1, max: 5 },
    showResults: { type: Boolean, default: true },
    timer: { type: Number, default: 0 },
    ratingMax: { type: Number, default: 5, enum: [5, 10] },
  },
});

const pollSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 500 },
  questions: { type: [questionSchema], validate: v => v.length > 0 },
  activeQuestionIndex: { type: Number, default: -1 },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed'],
    default: 'draft',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

pollSchema.index({ status: 1 });
pollSchema.index({ createdAt: -1 });

pollSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Poll', pollSchema);
