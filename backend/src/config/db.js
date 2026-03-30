import mongoose from 'mongoose';
import { config } from './index.js';
import logger from '../utils/logger.js';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000];

export async function connectDb() {
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(config.mongoUri);
      return;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        logger.error(`MongoDB connection failed after ${MAX_RETRIES + 1} attempts: ${err.message}`);
        throw err;
      }
      const delay = RETRY_DELAYS[attempt];
      logger.warn(`MongoDB connection attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
