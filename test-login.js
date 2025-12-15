// Test script to verify login functionality
import bcrypt from 'bcryptjs';
import User from './models/User.model.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to database
import connectDB from './config/db.js';
connectDB();

const testLogin = async () => {
  try {
    // Test traveler login
    const traveler = await User.findOne({ email: 'rohit.traveller@gmail.com' });
    if (traveler) {
      console.log('Traveler found:', traveler.name);
      const isPasswordValid = await bcrypt.compare('traveler123', traveler.passwordHash);
      console.log('Traveler password valid:', isPasswordValid);
    } else {
      console.log('Traveler not found');
    }
    
    // Test admin login
    const admin = await User.findOne({ email: 'sahil.admin@bookmyparcel.com' });
    if (admin) {
      console.log('Admin found:', admin.name);
      const isPasswordValid = await bcrypt.compare('admin123', admin.passwordHash);
      console.log('Admin password valid:', isPasswordValid);
    } else {
      console.log('Admin not found');
    }
    
    // Test super admin login
    const superAdmin = await User.findOne({ email: 'priti.superadmin@bookmyparcel.com' });
    if (superAdmin) {
      console.log('Super Admin found:', superAdmin.name);
      const isPasswordValid = await bcrypt.compare('superadmin123', superAdmin.passwordHash);
      console.log('Super Admin password valid:', isPasswordValid);
    } else {
      console.log('Super Admin not found');
    }
    
    // Close the database connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error testing login:', error);
  }
};

testLogin();