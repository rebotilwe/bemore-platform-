import mongoose from 'mongoose';
import { config } from './index.js';

export async function connectDb() {
  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));

  await mongoose.connect(config.mongoUri);
}
