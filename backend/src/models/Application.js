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
  engagementSource: { type: String, default: 'direct' },
  classification: { type: String, enum: ['hot', 'warm', 'cold', 'unclassified'], default: 'unclassified' },
  followUp: {
    required: { type: Boolean, default: false },
    dueDate: Date,
    notes: String,
    completedAt: Date,
  },
  adminNotes: String,
  allocatedProjects: [{ type: String }],
  // POPIA audit trail (spec §3 — Protection of Personal Information Act).
  // Captured at submission; both flags must be true (route validator enforces).
  // IMPORTANT: subdocument is `default: undefined` so that legacy applications
  // submitted BEFORE 2026-05-11 (when consent persistence was added) do NOT
  // have a fake consent block hydrated on read. Without this, Mongoose would
  // silently inject `{tc:false, popia:false, capturedAt:<now>}` for every
  // legacy doc on every read — corrupting the POPIA audit trail by:
  //   1. marking historic applicants as having NOT consented (false)
  //   2. stamping a fake `capturedAt` timestamp for the moment of read
  // The admin lead-detail modal falls back to legacy `formData.tcAccepted` /
  // `formData.popiaConsent` keys when `consent` is undefined.
  consent: {
    type: {
      tc: { type: Boolean, required: true },
      popia: { type: Boolean, required: true },
      capturedAt: { type: Date, default: Date.now },
    },
    default: undefined,
    _id: false,
  },
  attachments: {
    type: [{
      field: { type: String, required: true },        // 'cv' for Professional Q13
      filename: { type: String, required: true },     // sanitised original name
      storedAs: { type: String, required: true },     // UUID-based filename on disk
      size: { type: Number, required: true },
      mimeType: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

applicationSchema.index({ 'personal.email': 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ userType: 1 });
applicationSchema.index({ tags: 1 });
applicationSchema.index({ submittedAt: -1 });
applicationSchema.index({ classification: 1 });
applicationSchema.index({ engagementSource: 1 });
applicationSchema.index({ 'dealRoom.summitAccess': 1 });
applicationSchema.index({ classification: 1, status: 1 }); // Admin filtering by classification + status
applicationSchema.index({ engagementSource: 1, submittedAt: -1 }); // Source analytics
// Compound index for status lookup endpoint
applicationSchema.index({ refNumber: 1, 'personal.email': 1 });
// POPIA: auto-delete applications older than 24 months
applicationSchema.index({ submittedAt: 1 }, { expireAfterSeconds: 24 * 30 * 24 * 60 * 60 });

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
