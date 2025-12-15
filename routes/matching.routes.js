import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { 
  getMatchesForRequest, 
  createMatches 
} from '../controllers/matching.controller.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get matches for a specific request (USER or TRAVELER)
router.get('/request/:requestId', getMatchesForRequest);

// Create matches for all pending requests (ADMIN only)
router.post('/create', authorizeRoles('ADMIN'), createMatches);

export default router;