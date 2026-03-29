import Application from '../models/Application.js';
import { APPLICATION_STATUSES, FUNDER_NAMES, SORTABLE_FIELDS } from '../constants/enums.js';

const ALLOWED_UPDATE_FIELDS = ['status', 'dealRoom', 'adminNotes', 'classification', 'followUp'];

export async function createApplication(data) {
  // Extract engagement source from formData to top-level field
  if (data.formData?.engagementSource) {
    data.engagementSource = data.formData.engagementSource;
  }
  const app = new Application(data);
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
    Application.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
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
