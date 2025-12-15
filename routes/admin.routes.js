import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { 
  getPendingKYCs, 
  approveKYC, 
  getAllDeliveries, 
  getAllUsers, 
  getAllTravelers 
} from '../controllers/admin.controller.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(authorizeRoles('ADMIN'));

// Admin routes
router.get('/kyc/pending', getPendingKYCs);
router.post('/kyc/approve/:id', approveKYC);
router.get('/deliveries', getAllDeliveries);
router.get('/users', getAllUsers);
router.get('/travelers', getAllTravelers);

export default router;