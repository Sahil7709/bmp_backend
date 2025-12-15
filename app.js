import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import connectDB from './config/db.js';
import { initializeTwilio } from './utils/otp.utils.js';
import { seedUsers } from './models/User.model.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import travelerRoutes from './routes/traveler.routes.js';
import adminRoutes from './routes/admin.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import matchingRoutes from './routes/matching.routes.js';

// Load environment variables
dotenv.config();

// Initialize Twilio client
initializeTwilio();

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Cookie parser middleware
app.use(cookieParser());

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to database
connectDB().then(() => {
  // Seed default users after database connection
  seedUsers();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/traveler', travelerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/matching', matchingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default app;