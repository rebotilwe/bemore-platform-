import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import { config } from '../config/index.js';

export async function authenticateAdmin(email, password) {
  const admin = await Admin.findOne({ email });
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    return null;
  }

  const token = jwt.sign(
    { id: admin._id, email: admin.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );

  return { token, expiresIn: config.jwtExpiresIn, adminId: admin._id.toString() };
}
