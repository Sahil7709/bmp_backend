import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { 
  createRequest, 
  getRequestById, 
  searchRequests 
} from '../controllers/user.controller.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(authorizeRoles('USER'));

// User routes
router.post('/requests', createRequest);
router.get('/requests/:id', getRequestById);
router.get('/requests/search', searchRequests);

export default router;