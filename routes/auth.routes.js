import express from 'express';
import { requestOTP, verifyOTP, checkUserExists } from '../controllers/auth.controller.js';

const router = express.Router();

// Public routes
router.post('/request-otp', requestOTP);
router.post('/check-user-exists', checkUserExists);
router.post('/verify-otp', verifyOTP);

export default router;