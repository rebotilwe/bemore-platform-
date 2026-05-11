import { jest, describe, beforeAll, beforeEach, it, expect } from '@jest/globals';

// Mock EmailLog using ESM unstable_mockModule
jest.unstable_mockModule('../src/models/EmailLog.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({})
  }
}));

// Mock config — SMTP fields removed (Resend is sole provider).
// resendApiKey is null so `sendEmail` short-circuits with
// "RESEND_API_KEY not configured" before hitting the network. Tests only
// verify the `EmailLog.create` audit-trail write fires correctly.
jest.unstable_mockModule('../src/config/index.js', () => ({
  __esModule: true,
  config: {
    mail: {
      resendApiKey: null,
      from: 'test@bemore.co.za',
      fromName: 'Test BeMore'
    }
  }
}));

let sendSubmissionConfirmation, sendStatusNotification, sendSummitReminder,
    sendDataExportReceipt, sendDataDeleteReceipt, EmailLog;

beforeAll(async () => {
  const mailer = await import('../src/utils/mailer.js');
  sendSubmissionConfirmation = mailer.sendSubmissionConfirmation;
  sendStatusNotification = mailer.sendStatusNotification;
  sendSummitReminder = mailer.sendSummitReminder;
  sendDataExportReceipt = mailer.sendDataExportReceipt;
  sendDataDeleteReceipt = mailer.sendDataDeleteReceipt;
  EmailLog = (await import('../src/models/EmailLog.js')).default;
});

describe('mailer.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSubmissionConfirmation', () => {
    it('should call logEmail with correct data', async () => {
      await sendSubmissionConfirmation('test@example.com', 'BM-TEST001', 'John');
      expect(EmailLog.create).toHaveBeenCalled();
      const logCall = EmailLog.create.mock.calls[0][0];
      expect(logCall.template).toBe('submission_confirmation');
      expect(logCall.refNumber).toBe('BM-TEST001');
    });
  });

  describe('sendStatusNotification', () => {
    it('should send reviewing notification', async () => {
      await sendStatusNotification('test@example.com', 'BM-TEST002', 'Jane', 'reviewing');
      expect(EmailLog.create).toHaveBeenCalled();
      const logCall = EmailLog.create.mock.calls[0][0];
      expect(logCall.template).toBe('status_notification');
    });

    it('should not send for invalid status', async () => {
      await sendStatusNotification('test@example.com', 'BM-TEST003', 'Bob', 'invalid');
      expect(EmailLog.create).not.toHaveBeenCalled();
    });
  });

  describe('sendSummitReminder', () => {
    it('should send reminder email', async () => {
      await sendSummitReminder('test@example.com', 'BM-TEST004', 'Charlie');
      expect(EmailLog.create).toHaveBeenCalled();
      const logCall = EmailLog.create.mock.calls[0][0];
      expect(logCall.template).toBe('reminder');
    });
  });

  describe('sendDataExportReceipt (POPIA)', () => {
    it('should log a data_export_receipt template entry', async () => {
      await sendDataExportReceipt('test@example.com', 'BM-TEST005', 'Dana');
      expect(EmailLog.create).toHaveBeenCalled();
      const logCall = EmailLog.create.mock.calls[0][0];
      expect(logCall.template).toBe('data_export_receipt');
      expect(logCall.refNumber).toBe('BM-TEST005');
      expect(logCall.subject).toContain('Data Export Confirmed');
    });
  });

  describe('sendDataDeleteReceipt (POPIA)', () => {
    it('should log a data_delete_receipt template entry', async () => {
      await sendDataDeleteReceipt('test@example.com', 'BM-TEST006', 'Eli');
      expect(EmailLog.create).toHaveBeenCalled();
      const logCall = EmailLog.create.mock.calls[0][0];
      expect(logCall.template).toBe('data_delete_receipt');
      expect(logCall.refNumber).toBe('BM-TEST006');
      expect(logCall.subject).toContain('Data Deletion Confirmed');
    });
  });
});
