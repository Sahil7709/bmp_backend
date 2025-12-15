import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { updateLocation } from '../controllers/tracking.controller.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Tracking routes
router.post('/location/update', updateLocation);

export default router;