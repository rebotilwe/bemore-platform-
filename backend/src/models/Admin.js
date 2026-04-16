import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  createdAt: { type: Date, default: Date.now },
});

const Admin = mongoose.model('Admin', adminSchema);

export async function seedAdmin() {
  if (!config.admin.email || !config.admin.password) {
    return; // No seed credentials configured — skip
  }
  const exists = await Admin.findOne({ email: config.admin.email });
  if (!exists) {
    const hashed = await bcrypt.hash(config.admin.password, 10);
    await Admin.create({ email: config.admin.email, password: hashed, name: 'Admin' });
    logger.info('Admin account seeded');
  } else {
    // Sync password if env var changed since initial seed
    const match = await bcrypt.compare(config.admin.password, exists.password);
    if (!match) {
      exists.password = await bcrypt.hash(config.admin.password, 10);
      await exists.save();
      logger.info('Admin password updated from environment');
    }
  }
}

export default Admin;
