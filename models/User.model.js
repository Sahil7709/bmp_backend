import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true // Create index for better query performance
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true // Create index for better query performance
  },
  passwordHash: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['USER', 'TRAVELER', 'ADMIN'],
    default: 'USER'
  },
  kycStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  kycDocument: {
    type: String, // URL to document
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving (for admins and travelers)
userSchema.pre('save', async function() {
  // Only hash password if it's been modified and exists
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return;
  }
  
  try {
    // Hash password with salt rounds
    const saltRounds = 12;
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
  } catch (error) {
    throw error;
  }
});

// Create indexes for better query performance
// Removed duplicate index definitions for email and phone as they are already indexed in the schema
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

// Seed default users
export const seedUsers = async () => {
  try {
    // Define default users
    const defaultUsers = [
      {
        name: 'Rohit Sharma',
        email: 'rohit.traveller@gmail.com',
        phone: '9876543210',
        passwordHash: 'Traveler@123',
        role: 'TRAVELER',
        kycStatus: 'APPROVED'
      },
      {
        name: 'Sahil Patel',
        email: 'sahil.admin@bookmyparcel.com',
        phone: '9876543211',
        passwordHash: 'Admin@123',
        role: 'ADMIN'
      },
      {
        name: 'Priti Mehta',
        email: 'priti.superadmin@bookmyparcel.com',
        phone: '9876543212',
        passwordHash: 'SuperAdmin@123',
        role: 'ADMIN'
      }
    ];

    // Check and create each user individually
    for (const userData of defaultUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
      }
    }
  } catch (error) {
    // Silently handle errors to avoid console output
  }
};

export default User;