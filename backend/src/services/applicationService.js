import Application from '../models/Application.js';
import { APPLICATION_STATUSES, FUNDER_NAMES, SORTABLE_FIELDS } from '../constants/enums.js';
import {
  ALLOWED_ATTACHMENT_FIELDS,
  cvStat,
  mimeFromStoredName,
  sanitizeFilename,
  getDocumentStat,   // ← added
} from './uploadService.js';

const ALLOWED_UPDATE_FIELDS = ['status', 'dealRoom', 'adminNotes', 'classification', 'followUp', 'allocatedProjects'];

/**
 * Resolve user-supplied attachment refs to full metadata by stat'ing disk.
 * Throws err.status=400 + err.code on validation failure.
 * Spec §8.2.
 */
async function resolveAttachments(refs = []) {
  if (!Array.isArray(refs) || refs.length === 0) return [];
  const resolved = [];
  for (const ref of refs) {
    if (!ref || typeof ref !== 'object') {
      const err = new Error('Invalid attachment entry');
      err.status = 400;
      err.code = 'ATTACHMENT_FIELD_INVALID';
      throw err;
    }
    if (!ALLOWED_ATTACHMENT_FIELDS.has(ref.field)) {
      const err = new Error(`Attachment field "${ref.field}" not allowed`);
      err.status = 400;
      err.code = 'ATTACHMENT_FIELD_INVALID';
      throw err;
    }

    // Use getDocumentStat instead of cvStat so it checks the correct
    // directory for each field type (cv/ vs documents/).
    const stat = await getDocumentStat(ref.storedAs, ref.field);

    if (!stat.exists) {
      const err = new Error(`Attachment ${ref.storedAs} not found in ${ref.field} directory`);
      err.status = 400;
      err.code = 'ATTACHMENT_NOT_FOUND';
      throw err;
    }
    resolved.push({
      field: ref.field,
      filename: sanitizeFilename(ref.filename) || ref.storedAs,
      storedAs: ref.storedAs,
      size: stat.size,
      mimeType: mimeFromStoredName(ref.storedAs),
      uploadedAt: new Date(),
    });
  }
  return resolved;
}

export async function createApplication(data) {
  // Extract engagement source from formData to top-level field
  if (data.formData?.engagementSource) {
    data.engagementSource = data.formData.engagementSource;
  }

  // Resolve attachments (validates + reads metadata from disk).
  const attachments = await resolveAttachments(data.attachments);

  // Duplicate check: same email + userType = duplicate
  if (data.personal?.email) {
    const existing = await Application.findOne({
      'personal.email': data.personal.email.toLowerCase(),
      userType: data.userType,
    }).select('refNumber').lean();

    if (existing) {
      const err = new Error(`An application for this email as ${data.userType} already exists (${existing.refNumber}). Use the status page to check your application.`);
      err.status = 409;
      throw err;
    }
  }

  const app = new Application({ ...data, attachments });
  await app.save();
  return app;
}

export function buildFilter(query) {
  const filter = {};
  if (query.userType && query.userType !== 'all') filter.userType = query.userType;
  if (query.status && query.status !== 'all') filter.status = query.status;
  if (query.tags) filter.tags = query.tags;
  if (query.search) {
    const q = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { 'personal.firstName': q },
      { 'personal.surname': q },
      { 'personal.email': q },
      { refNumber: q },
    ];
  }
  return filter;
}

export function buildSort(query) {
  if (query.sortBy && SORTABLE_FIELDS.includes(query.sortBy)) {
    return { [query.sortBy]: query.order === 'asc' ? 1 : -1 };
  }
  return { submittedAt: -1 };
}

export async function listApplications(query) {
  const filter = buildFilter(query);
  const sort = buildSort(query);
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 50;

  const [total, data] = await Promise.all([
    Application.countDocuments(filter),
    Application.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
  ]);

  return { data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function getApplicationById(id) {
  return Application.findById(id);
}

export function sanitizeUpdate(body) {
  const updates = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (updates.status && !APPLICATION_STATUSES.includes(updates.status)) {
    throw Object.assign(new Error('Invalid status'), { status: 400 });
  }

  if (updates.classification && !['hot', 'warm', 'cold', 'unclassified'].includes(updates.classification)) {
    throw Object.assign(new Error('Invalid classification'), { status: 400 });
  }

  if (updates.dealRoom?.funders) {
    if (!updates.dealRoom.funders.every(f => FUNDER_NAMES.includes(f))) {
      throw Object.assign(new Error('Invalid funder name'), { status: 400 });
    }
  }

  updates.updatedAt = new Date();
  return updates;
}

export async function updateApplication(id, updates) {
  return Application.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
}

export async function getStats() {
  const [total, byType, byStatus, byTag, bySource, byClassification, recentApps] = await Promise.all([
    Application.countDocuments(),
    Application.aggregate([{ $group: { _id: '$userType', count: { $sum: 1 } } }]),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.aggregate([{ $unwind: '$tags' }, { $group: { _id: '$tags', count: { $sum: 1 } } }]),
    Application.aggregate([{ $group: { _id: { $ifNull: ['$engagementSource', 'direct'] }, count: { $sum: 1 } } }]),
    Application.aggregate([{ $group: { _id: { $ifNull: ['$classification', 'unclassified'] }, count: { $sum: 1 } } }]),
    Application.find().sort({ submittedAt: -1 }).limit(8),
  ]);

  return { total, byType, byStatus, byTag, bySource, byClassification, recentApps };
}

export async function getAllApplications() {
  return Application.find().sort({ submittedAt: -1 });
}