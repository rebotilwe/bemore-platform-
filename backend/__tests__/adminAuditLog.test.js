import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import AdminAuditLog from '../src/models/AdminAuditLog.js';

let mongoServer;

describe('AdminAuditLog Model — FICA Compliance', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    }
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await AdminAuditLog.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid audit log entry', async () => {
      const entry = await AdminAuditLog.create({
        admin: { email: 'admin@bemore.co.za' },
        action: 'login',
        ip: '127.0.0.1',
        requestId: 'req_abc123',
        status: 'success',
      });
      expect(entry._id).toBeDefined();
      expect(entry.action).toBe('login');
      expect(entry.status).toBe('success');
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('should require action field', async () => {
      try {
        await AdminAuditLog.create({
          admin: { email: 'admin@test.com' },
        });
        expect(true).toBe(false); // Should not reach here
      } catch (e) {
        expect(e.errors.action).toBeDefined();
      }
    });

    it('should require admin email', async () => {
      try {
        await AdminAuditLog.create({
          action: 'login',
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e.errors['admin.email']).toBeDefined();
      }
    });

    it('should accept all valid action enum values', async () => {
      const actions = [
        'login', 'logout', 'login_failed',
        'status_update', 'bulk_status_update',
        'data_export', 'data_delete',
        'email_reminder_sent', 'bulk_email_sent',
        'settings_update',
        'report_generated',
        'poll_create', 'poll_update', 'poll_delete', 'poll_activate',
        'application_view', 'lead_classify',
      ];

      for (const action of actions) {
        const entry = await AdminAuditLog.create({
          admin: { email: 'admin@test.com' },
          action,
        });
        expect(entry.action).toBe(action);
      }
    });

    it('should reject invalid action enum value', async () => {
      try {
        await AdminAuditLog.create({
          admin: { email: 'admin@test.com' },
          action: 'invalid_action',
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e.errors.action).toBeDefined();
      }
    });

    it('should accept both success and failure status', async () => {
      const successEntry = await AdminAuditLog.create({
        admin: { email: 'admin@test.com' },
        action: 'login',
        status: 'success',
      });
      expect(successEntry.status).toBe('success');

      const failEntry = await AdminAuditLog.create({
        admin: { email: 'admin@test.com' },
        action: 'login_failed',
        status: 'failure',
        errorMessage: 'Invalid password',
      });
      expect(failEntry.status).toBe('failure');
      expect(failEntry.errorMessage).toBe('Invalid password');
    });

    it('should default status to success', async () => {
      const entry = await AdminAuditLog.create({
        admin: { email: 'admin@test.com' },
        action: 'login',
      });
      expect(entry.status).toBe('success');
    });

    it('should store admin object with id and email', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const entry = await AdminAuditLog.create({
        admin: { id: adminId, email: 'admin@test.com' },
        action: 'settings_update',
      });
      expect(entry.admin.id.toString()).toBe(adminId.toString());
      expect(entry.admin.email).toBe('admin@test.com');
    });

    it('should store target information', async () => {
      const targetId = new mongoose.Types.ObjectId();
      const entry = await AdminAuditLog.create({
        admin: { email: 'admin@test.com' },
        action: 'status_update',
        target: { model: 'Application', id: targetId, refNumber: 'BM-2026-1234' },
      });
      expect(entry.target.model).toBe('Application');
      expect(entry.target.id.toString()).toBe(targetId.toString());
      expect(entry.target.refNumber).toBe('BM-2026-1234');
    });

    it('should store details as Mixed type', async () => {
      const entry = await AdminAuditLog.create({
        admin: { email: 'admin@test.com' },
        action: 'bulk_status_update',
        details: { ids: ['BM-1', 'BM-2'], oldStatus: 'new', newStatus: 'reviewing' },
      });
      expect(entry.details.ids).toEqual(['BM-1', 'BM-2']);
    });

    it('should store request context', async () => {
      const entry = await AdminAuditLog.create({
        admin: { email: 'admin@test.com' },
        action: 'login',
        ip: '196.168.1.1',
        userAgent: 'Mozilla/5.0...',
        requestId: 'req_xyz789',
      });
      expect(entry.ip).toBe('196.168.1.1');
      expect(entry.userAgent).toBe('Mozilla/5.0...');
      expect(entry.requestId).toBe('req_xyz789');
    });
  });

  describe('TTL Index (FICA 7-Year Retention)', () => {
    it('should have TTL index on timestamp field', async () => {
      const indexes = await AdminAuditLog.collection.getIndexes({ full: true });
      const ttlIndex = indexes.find(idx => idx.key?.timestamp === 1 && idx.expireAfterSeconds);
      expect(ttlIndex).toBeDefined();
      // 7 years = 220903200 seconds
      expect(ttlIndex.expireAfterSeconds).toBe(220903200);
    });

    it('should have compound index on admin+timestamp', async () => {
      const indexes = await AdminAuditLog.collection.getIndexes({ full: true });
      const compoundIndex = indexes.find(idx => 
        idx.key?.admin === 1 && idx.key?.timestamp === -1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have index on action+timestamp', async () => {
      const indexes = await AdminAuditLog.collection.getIndexes({ full: true });
      const actionIndex = indexes.find(idx => 
        idx.key?.action === 1 && idx.key?.timestamp === -1
      );
      expect(actionIndex).toBeDefined();
    });
  });

  describe('FICA Compliance Queries', () => {
    beforeEach(async () => {
      await AdminAuditLog.create([
        {
          admin: { email: 'admin1@test.com' },
          action: 'login',
          timestamp: new Date('2025-01-01'),
        },
        {
          admin: { id: new mongoose.Types.ObjectId(), email: 'admin1@test.com' },
          action: 'status_update',
          target: { model: 'Application', refNumber: 'BM-001' },
          timestamp: new Date('2025-06-15'),
        },
        {
          admin: { email: 'admin2@test.com' },
          action: 'settings_update',
          timestamp: new Date('2026-03-15'),
        },
      ]);
    });

    it('should query by admin email', async () => {
      const logs = await AdminAuditLog.find({ 'admin.email': 'admin1@test.com' });
      expect(logs.length).toBe(2);
    });

    it('should query by action type', async () => {
      const logs = await AdminAuditLog.find({ action: 'login' });
      expect(logs.length).toBe(1);
    });

    it('should sort by timestamp descending', async () => {
      const logs = await AdminAuditLog.find().sort({ timestamp: -1 });
      expect(logs[0].admin.email).toBe('admin2@test.com');
    });

    it('should query by date range', async () => {
      const logs = await AdminAuditLog.find({
        timestamp: {
          $gte: new Date('2025-06-01'),
          $lte: new Date('2025-07-01'),
        },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('status_update');
    });
  });
});
