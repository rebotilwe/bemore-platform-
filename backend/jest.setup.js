import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Note: process.env.UPLOAD_DIR is seeded in jest.env-setup.js (runs before module imports).

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000); // 60 second timeout

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 60000);