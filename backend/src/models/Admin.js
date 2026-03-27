import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  createdAt: { type: Date, default: Date.now },
});

const Admin = mongoose.model('Admin', adminSchema);

export async function seedAdmin() {
  const exists = await Admin.findOne({ email: config.admin.email });
  if (!exists) {
    const hashed = await bcrypt.hash(config.admin.password, 10);
    await Admin.create({ email: config.admin.email, password: hashed, name: 'Admin' });
    console.log('Admin seeded');
  }
}

export default Admin;
