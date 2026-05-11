/**
 * Application model schema tests — BE-1
 * Asserts attachments[] field defaults and legacy doc compat.
 */
import mongoose from 'mongoose';
import Application from '../src/models/Application.js';

afterEach(async () => {
  await Application.deleteMany({});
});

describe('Application model — attachments[] schema', () => {
  const baseDoc = {
    userType: 'developer',
    personal: {
      firstName: 'Alex',
      surname: 'Soko',
      email: 'alex@example.com',
      phone: '+27821234567',
    },
    formData: {},
  };

  it('defaults attachments to []', () => {
    const app = new Application(baseDoc);
    expect(Array.isArray(app.attachments)).toBe(true);
    expect(app.attachments.length).toBe(0);
  });

  it('persists attachments[] entries with all required fields', async () => {
    const app = new Application({
      ...baseDoc,
      attachments: [{
        field: 'cv',
        filename: 'cv.pdf',
        storedAs: 'abc-123.pdf',
        size: 1024,
        mimeType: 'application/pdf',
      }],
    });
    await app.save();
    const saved = await Application.findById(app._id);
    expect(saved.attachments).toHaveLength(1);
    expect(saved.attachments[0].field).toBe('cv');
    expect(saved.attachments[0].filename).toBe('cv.pdf');
    expect(saved.attachments[0].storedAs).toBe('abc-123.pdf');
    expect(saved.attachments[0].size).toBe(1024);
    expect(saved.attachments[0].mimeType).toBe('application/pdf');
    expect(saved.attachments[0].uploadedAt).toBeInstanceOf(Date);
  });

  it('loads legacy documents (no attachments key) without throwing', async () => {
    // Insert a raw doc directly through the collection to simulate legacy state
    const collection = mongoose.connection.collection('applications');
    await collection.insertOne({
      refNumber: 'BM-LEGACY01',
      userType: 'developer',
      personal: {
        firstName: 'Legacy',
        surname: 'User',
        email: 'legacy@example.com',
        phone: '+27821234567',
      },
      formData: { landStatus: 'Land Secured' },
      tags: ['LAND_SECURED'],
      status: 'new',
      submittedAt: new Date(),
    });

    const found = await Application.findOne({ refNumber: 'BM-LEGACY01' });
    expect(found).not.toBeNull();
    // Mongoose populates a default empty array for missing schema-defined arrays
    expect(Array.isArray(found.attachments)).toBe(true);
    expect(found.attachments.length).toBe(0);
  });

  it('does not add a TTL or new index for attachments', () => {
    const indexes = Application.schema.indexes();
    const hasAttachmentIndex = indexes.some(([fields]) => Object.keys(fields).some(k => k.startsWith('attachments')));
    expect(hasAttachmentIndex).toBe(false);
  });
});
