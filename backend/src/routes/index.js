import express from 'express';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

import applicationRoutes from './applications.js';

const router = express.Router();

// Mount applications router (handles both public + admin routes internally)
router.use('/applications', applicationRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    env: config.nodeEnv, 
    timestamp: new Date().toISOString() 
  });
});

// 404 fallback
router.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Not Found', 
    path: req.originalUrl 
  });
});

export default router;