import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PROFILE_CATEGORIES, APPLICATION_STATUSES, FUNDER_NAMES } from '../constants/enums.js';
import { autoTag } from '../utils/autoTag.js';

const applicationSchema = new mongoose.Schema({
  refNumber: { type: String, unique: true },
  userType: { type: String, enum: PROFILE_CATEGORIES, required: true },
  personal: {
    firstName: { type: String, required: true },
    surname: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    companyName: String,
  },
  formData: mongoose.Schema.Types.Mixed,
  tags: [String],
  status: { type: String, enum: APPLICATION_STATUSES, default: 'new' },
  dealRoom: {
    summitAccess: { type: Boolean, default: false },
    dealRoomEntry: { type: Boolean, default: false },
    funders: [{ type: String, enum: FUNDER_NAMES }],
  },
  adminNotes: String,
  submittedAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

applicationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (!this.refNumber) {
    this.refNumber = 'BM-' + uuidv4().slice(0, 8).toUpperCase();
  }
  if (!this.tags || this.tags.length === 0) {
    this.tags = autoTag(this.userType, this.formData);
  }
  next();
});

export default mongoose.model('Application', applicationSchema);
