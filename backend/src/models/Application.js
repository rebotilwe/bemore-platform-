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
  // NEW: Routing information
  routing: {
    department: { 
      type: String, 
      enum: ['pormat_sales', 'pormat_management', 'muma_consulting', 'unassigned'],
      default: 'unassigned'
    },
    leadType: { 
      type: String,
      enum: ['development_project', 'land', 'investment', 'student_accommodation', 'consultant_panel', 'aspiring_developer', 'general'],
      default: 'general'
    },
    assignedTo: { type: String },
    assignedAt: Date,
    status: { 
      type: String,
      enum: ['pending', 'assigned', 'reviewed', 'completed'],
      default: 'pending'
    },
  },
  // POPIA audit trail
  consent: {
    type: {
      tc: { type: Boolean, required: true },
      popia: { type: Boolean, required: true },
      capturedAt: { type: Date, default: Date.now },
    },
    default: undefined,
    _id: false,
  },
  // UPDATED: Multi-document upload with expiry tracking
  attachments: {
    type: [{
      field: { 
        type: String, 
        required: true,
        enum: ['cv', 'company_registration', 'tax_clearance', 'bee_certificate', 'professional_indemnity']
      },
      filename: { type: String, required: true },
      storedAs: { type: String, required: true },
      size: { type: Number, required: true },
      mimeType: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      // NEW: Document expiry tracking
      expiryDate: Date,
      isVerified: { type: Boolean, default: false },
      verifiedAt: Date,
      verifiedBy: String,
      rejectionReason: String,
    }],
    default: [],
  },
  // NEW: Professional workload tracking
  workload: {
    activeProjects: { type: Number, default: 0 },
    maxProjects: { type: Number, default: 5 },
    projectHistory: [{
      projectId: String,
      allocatedAt: Date,
      completedAt: Date,
      status: { type: String, enum: ['active', 'completed', 'archived'] },
    }],
  },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

// Indexes
applicationSchema.index({ 'personal.email': 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ userType: 1 });
applicationSchema.index({ tags: 1 });
applicationSchema.index({ submittedAt: -1 });
applicationSchema.index({ classification: 1 });
applicationSchema.index({ engagementSource: 1 });
applicationSchema.index({ 'dealRoom.summitAccess': 1 });
applicationSchema.index({ classification: 1, status: 1 });
applicationSchema.index({ engagementSource: 1, submittedAt: -1 });
applicationSchema.index({ refNumber: 1, 'personal.email': 1 });
applicationSchema.index({ 'routing.department': 1 });
applicationSchema.index({ 'routing.status': 1 });
applicationSchema.index({ 'workload.activeProjects': 1 });
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