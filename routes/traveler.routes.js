import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { 
  getFeed, 
  acceptMatch, 
  verifyPickupOTP, 
  verifyDropOTP 
} from '../controllers/traveler.controller.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(authorizeRoles('TRAVELER'));

// Traveler routes
router.get('/feed', getFeed);
router.post('/accept/:matchId', acceptMatch);
router.post('/delivery/pickup-otp', verifyPickupOTP);
router.post('/delivery/drop-otp', verifyDropOTP);

export default router;