import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Ensure NODE_ENV is 'test' regardless of how jest is invoked
process.env.NODE_ENV = 'test';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
