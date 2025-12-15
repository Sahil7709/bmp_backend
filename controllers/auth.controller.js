import User from '../models/User.model.js';
import { generateOTP, sendOTP } from '../utils/otp.utils.js';
import { storeOTP, getOTP, deleteOTP, isOTPExpired } from '../utils/otpStorage.utils.js';
import { generateToken } from '../utils/jwt.utils.js';
import { hashOTP, compareOTP } from '../utils/bcrypt.utils.js';
import bcrypt from 'bcryptjs';

// Rate limiting for OTP requests
const otpRequestCounts = new Map();
const MAX_OTP_REQUESTS_PER_HOUR = 5;
const OTP_RESET_INTERVAL = 60 * 60 * 1000; // 1 hour

// Request OTP for login
export const requestOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    
    // Validate phone number format (Indian mobile numbers)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format. Please enter a valid 10-digit Indian mobile number.' });
    }
    
    // Rate limiting
    const now = Date.now();
    const userRequests = otpRequestCounts.get(phone) || [];
    
    // Filter out requests older than 1 hour
    const recentRequests = userRequests.filter(time => now - time < OTP_RESET_INTERVAL);
    
    if (recentRequests.length >= MAX_OTP_REQUESTS_PER_HOUR) {
      return res.status(429).json({ 
        message: 'Too many OTP requests. Please try again later.' 
      });
    }
    
    // Update request count
    recentRequests.push(now);
    otpRequestCounts.set(phone, recentRequests);
    
    // Generate 6-digit OTP
    const otp = generateOTP();
    
    // Hash the OTP for secure storage
    const hashedOTP = await hashOTP(otp);
    
    // Store OTP with expiration (5 minutes)
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    storeOTP(phone, hashedOTP, expiresAt);
    
    // Send OTP via Twilio
    const sendResult = await sendOTP(phone, otp);
    
    if (!sendResult.success) {
      // If OTP failed to send, remove it from storage and return error
      deleteOTP(phone);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send OTP. Please try again.',
        error: sendResult.error
      });
    }
    
    // In development mode, also return the OTP for testing purposes
    const response = { 
      success: true, 
      message: 'OTP sent successfully',
      expiresAt
    };
    
    // Add OTP to response in development mode for testing
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      response.otp = otp; // Only for development/testing
    }
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in requestOTP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify OTP and login/register user
export const verifyOTP = async (req, res) => {
  try {
    const { phone, otp, role } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }
    
    // Validate phone number format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }
    
    // Validate OTP format
    const otpRegex = /^[0-9]{6}$/;
    if (!otpRegex.test(otp)) {
      return res.status(400).json({ message: 'Invalid OTP format' });
    }
    
    // Get stored OTP
    const storedData = getOTP(phone);
    
    if (!storedData) {
      return res.status(400).json({ message: 'OTP not requested or expired' });
    }
    
    const { otp: hashedOTP, expiresAt } = storedData;
    
    // Check if OTP is expired
    if (isOTPExpired(expiresAt)) {
      deleteOTP(phone);
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    // Compare OTP with hashed value
    if (!(await compareOTP(otp, hashedOTP))) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Delete used OTP
    deleteOTP(phone);
    
    // Check if user exists, if not create new user with specified role or USER as default
    let user = await User.findOne({ phone });
    
    // If user doesn't exist and no role is provided, return error for login attempts
    if (!user && !role) {
      return res.status(400).json({ message: 'User not found. Please register first.' });
    }
    
    // If user doesn't exist and role is provided, create new user
    if (!user && role) {
      // Create user with default values that will be updated during profile setup
      user = new User({
        phone,
        role,
        name: `User${Math.floor(Math.random() * 10000)}`, // Generate a temporary name
        email: `${phone}@bookmyparcel.com` // Generate a temporary email
      });
      
      await user.save();
    }
    
    // Generate JWT token
    const token = generateToken({
      id: user._id,
      role: user.role
    });
    
    res.status(200).json({
      success: true,
      message: user.role ? 'User registered successfully' : 'Login successful',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role,
        name: user.name,
        email: user.email,
        isProfileComplete: user.isProfileComplete
      }
    });
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Check if user exists
export const checkUserExists = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    
    // Validate phone number format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }
    
    const user = await User.findOne({ phone });
    
    res.status(200).json({
      exists: !!user,
      message: user ? 'User exists' : 'User not found'
    });
  } catch (error) {
    console.error('Error in checkUserExists:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};