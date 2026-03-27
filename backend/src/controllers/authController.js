import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import { config } from '../config/index.js';

export async function login(req, res, next) {
  try {
    const admin = await Admin.findOne({ email: req.body.email });
    if (!admin || !(await bcrypt.compare(req.body.password, admin.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    );
    res.json({ success: true, data: { token, expiresIn: config.jwtExpiresIn } });
  } catch (err) {
    next(err);
  }
}

export function verify(_req, res) {
  res.json({ success: true });
}
