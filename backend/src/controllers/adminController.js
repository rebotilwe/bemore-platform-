import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import { track } from '../services/analyticsService.js';
import logger from '../utils/logger.js';
import { redactEmail } from '../utils/redactPII.js';

export async function listAdmins(req, res, next) {
  try {
    const admins = await Admin.find()
      .select('_id email name createdAt')
      .sort({ createdAt: 1 })
      .lean();
    res.json({ success: true, data: admins });
  } catch (err) {
    next(err);
  }
}

export async function createAdmin(req, res, next) {
  try {
    const { email, password, name } = req.body;

    const exists = await Admin.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'An admin with this email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ email, password: hashed, name: name || '' });

    track('admin.created', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      meta: { targetEmail: email },
      req,
    });

    logger.info(`Admin created: ${redactEmail(email)}`);

    // Log to AdminAuditLog
    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'admin_created',
      target: { model: 'Admin', id: admin._id, refNumber: undefined },
      details: { targetEmail: redactEmail(email) },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => console.error('Audit log failed:', err.message));

    res.status(201).json({
      success: true,
      data: { _id: admin._id, email: admin.email, name: admin.name, createdAt: admin.createdAt },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { email, password, name } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (email && email !== admin.email) {
      const duplicate = await Admin.findOne({ email });
      if (duplicate) {
        return res.status(409).json({ success: false, message: 'An admin with this email already exists' });
      }
      admin.email = email;
    }

    if (name !== undefined) admin.name = name;
    if (password) admin.password = await bcrypt.hash(password, 10);

    await admin.save();

    track('admin.updated', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      meta: { targetId: id },
      req,
    });

    logger.info(`Admin updated: ${redactEmail(admin.email)}`);

    // Log to AdminAuditLog
    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'admin_updated',
      target: { model: 'Admin', id: admin._id },
      details: { targetEmail: redactEmail(admin.email) },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => console.error('Audit log failed:', err.message));

    res.json({
      success: true,
      data: { _id: admin._id, email: admin.email, name: admin.name, createdAt: admin.createdAt },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdmin(req, res, next) {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.admin?.id === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    // Ensure at least one admin remains
    const count = await Admin.countDocuments();
    if (count <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the last admin account' });
    }

    const admin = await Admin.findByIdAndDelete(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    track('admin.deleted', 'admin', {
      actor: { type: 'admin', id: req.admin?.id },
      meta: { targetEmail: admin.email },
      req,
    });

    logger.info(`Admin deleted: ${redactEmail(admin.email)}`);

    // Log to AdminAuditLog
    await AdminAuditLog.create({
      admin: { id: req.admin?.id, email: redactEmail(req.admin?.email) },
      action: 'admin_deleted',
      target: { model: 'Admin', id: admin._id },
      details: { targetEmail: redactEmail(admin.email) },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      status: 'success',
    }).catch(err => console.error('Audit log failed:', err.message));

    res.json({ success: true, message: 'Admin deleted' });
  } catch (err) {
    next(err);
  }
}
