import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import EmailLog from '../src/models/EmailLog.js';

let mongoServer;

describe('EmailLog Model — POPIA Compliance', () => {
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
    await EmailLog.deleteMany({});
    // Insert a document to ensure collection and indexes exist
    await EmailLog.create({
      to: 'setup@example.com',
      subject: 'Setup',
      template: 'submission_confirmation',
      status: 'sent',
    });
  });

  describe('Schema Validation', () => {
    it('should create a valid email log entry', async () => {
      const entry = await EmailLog.create({
        to: 'user@example.com',
        subject: 'Application Submitted',
        template: 'submission_confirmation',
        refNumber: 'BM-2026-1234',
        status: 'sent',
      });
      expect(entry._id).toBeDefined();
      expect(entry.to).toBe('user@example.com');
      expect(entry.status).toBe('sent');
      expect(entry.sentAt).toBeInstanceOf(Date);
    });

    it('should require to field', async () => {
      try {
        await EmailLog.create({
          subject: 'Test',
          template: 'submission_confirmation',
          status: 'sent',
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e.errors.to).toBeDefined();
      }
    });

    it('should require subject field', async () => {
      try {
        await EmailLog.create({
          to: 'user@example.com',
          template: 'submission_confirmation',
          status: 'sent',
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e.errors.subject).toBeDefined();
      }
    });

    it('should require template field', async () => {
      try {
        await EmailLog.create({
          to: 'user@example.com',
          subject: 'Test',
          status: 'sent',
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e.errors.template).toBeDefined();
      }
    });

    it('should require status field', async () => {
      try {
        await EmailLog.create({
          to: 'user@example.com',
          subject: 'Test',
          template: 'submission_confirmation',
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e.errors.status).toBeDefined();
      }
    });

    it('should accept valid template values', async () => {
      const templates = ['submission_confirmation', 'status_notification', 'summit_reminder'];
      for (const template of templates) {
        const entry = await EmailLog.create({
          to: 'user@example.com',
          subject: 'Test',
          template,
          status: 'sent',
        });
        expect(entry.template).toBe(template);
      }
    });

    it('should only accept sent or failed status', async () => {
      const sentEntry = await EmailLog.create({
        to: 'user@example.com',
        subject: 'Test',
        template: 'submission_confirmation',
        status: 'sent',
      });
      expect(sentEntry.status).toBe('sent');

      const failedEntry = await EmailLog.create({
        to: 'user@example.com',
        subject: 'Test',
        template: 'submission_confirmation',
        status: 'failed',
        error: 'SMTP connection failed',
      });
      expect(failedEntry.status).toBe('failed');
      expect(failedEntry.error).toBe('SMTP connection failed');
    });

    it('should reject invalid status', async () => {
      try {
        await EmailLog.create({
          to: 'user@example.com',
          subject: 'Test',
          template: 'submission_confirmation',
          status: 'pending', // invalid
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e.errors.status).toBeDefined();
      }
    });

    it('should store refNumber as optional', async () => {
      const withRef = await EmailLog.create({
        to: 'user@example.com',
        subject: 'Test',
        template: 'submission_confirmation',
        status: 'sent',
        refNumber: 'BM-2026-1234',
      });
      expect(withRef.refNumber).toBe('BM-2026-1234');

      const withoutRef = await EmailLog.create({
        to: 'user@example.com',
        subject: 'Test',
        template: 'submission_confirmation',
        status: 'sent',
      });
      expect(withoutRef.refNumber).toBeUndefined();
    });

    it('should store error for failed emails', async () => {
      const entry = await EmailLog.create({
        to: 'user@example.com',
        subject: 'Test',
        template: 'submission_confirmation',
        status: 'failed',
        error: 'SMTP timeout after 10s',
      });
      expect(entry.error).toBe('SMTP timeout after 10s');
    });
  });

  describe('TTL Index (POPIA 24-Month Retention)', () => {
    it('should have TTL index on sentAt field', async () => {
      const indexes = await EmailLog.collection.getIndexes({ full: true });
      const ttlIndex = indexes.find(idx => idx.key?.sentAt === 1 && idx.expireAfterSeconds);
      expect(ttlIndex).toBeDefined();
      // 24 months = 730 days = 63072000 seconds
      expect(ttlIndex.expireAfterSeconds).toBe(63072000);
    });

    it('should have index on sentAt for queries', async () => {
      const indexes = await EmailLog.collection.getIndexes({ full: true });
      const sentAtIndex = indexes.find(idx => 
        idx.key?.sentAt === -1 && !idx.expireAfterSeconds
      );
      expect(sentAtIndex).toBeDefined();
    });

    it('should have compound index on refNumber+sentAt', async () => {
      const indexes = await EmailLog.collection.getIndexes({ full: true });
      const compoundIndex = indexes.find(idx => 
        idx.key?.refNumber === 1 && idx.key?.sentAt === -1
      );
      expect(compoundIndex).toBeDefined();
    });
  });

  describe('POPIA Compliance Queries', () => {
    beforeEach(async () => {
      await EmailLog.create([
        {
          to: 'user1@example.com',
          subject: 'Submission Confirmation',
          template: 'submission_confirmation',
          refNumber: 'BM-001',
          status: 'sent',
          sentAt: new Date('2026-01-15'),
        },
        {
          to: 'user2@example.com',
          subject: 'Status Update',
          template: 'status_notification',
          refNumber: 'BM-001',
          status: 'sent',
          sentAt: new Date('2026-02-20'),
        },
        {
          to: 'user3@example.com',
          subject: 'Reminder',
          template: 'summit_reminder',
          status: 'failed',
          error: 'SMTP failed',
          sentAt: new Date('2026-03-10'),
        },
      ]);
    });

    it('should query by refNumber to find all emails for an application', async () => {
      const logs = await EmailLog.find({ refNumber: 'BM-001' });
      expect(logs.length).toBe(2);
    });

    it('should query by status', async () => {
      const sent = await EmailLog.find({ status: 'sent' });
      expect(sent.length).toBe(2);

      const failed = await EmailLog.find({ status: 'failed' });
      expect(failed.length).toBe(1);
      expect(failed[0].error).toBe('SMTP failed');
    });

    it('should query by recipient email', async () => {
      const logs = await EmailLog.find({ to: 'user1@example.com' });
      expect(logs.length).toBe(1);
    });

    it('should sort by sentAt descending', async () => {
      const logs = await EmailLog.find().sort({ sentAt: -1 });
      expect(logs[0].to).toBe('user3@example.com');
    });

    it('should query by date range for reporting', async () => {
      const logs = await EmailLog.find({
        sentAt: {
          $gte: new Date('2026-02-01'),
          $lte: new Date('2026-03-01'),
        },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].template).toBe('status_notification');
    });

    it('should count emails by template type', async () => {
      const result = await EmailLog.aggregate([
        { $group: { _id: '$template', count: { $sum: 1 } } },
      ]);
      const submissionCount = result.find(r => r._id === 'submission_confirmation');
      expect(submissionCount.count).toBe(1);
    });
  });
});
