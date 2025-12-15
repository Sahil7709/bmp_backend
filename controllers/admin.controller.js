import User from '../models/User.model.js';
import KYCDocument from '../models/KYC.model.js';
import Delivery from '../models/Delivery.model.js';

// In-memory cache for admin data
class AdminCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 60000; // 60 seconds
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Clean up old entries
    if (this.cache.size > 100) { // Limit cache size
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  clear() {
    this.cache.clear();
  }
}

const adminCache = new AdminCache();

// Get pending KYC documents
export const getPendingKYCs = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    
    // Validate and sanitize inputs
    const parsedLimit = Math.min(parseInt(limit) || 10, 50); // Max 50 items per page
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    
    // Build cache key
    const cacheKey = `pending_kyc_${parsedPage}_${parsedLimit}`;
    
    // Check cache first
    const cachedKYCs = adminCache.get(cacheKey);
    if (cachedKYCs) {
      return res.status(200).json(cachedKYCs);
    }
    
    // Find pending KYC documents
    const filter = { status: 'PENDING' };
    
    // Pagination
    const skip = (parsedPage - 1) * parsedLimit;
    
    // Use projection for better performance
    const kycDocs = await KYCDocument.find(filter, {
      userId: 1,
      docType: 1,
      status: 1,
      createdAt: 1
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(); // Use lean() for better performance
    
    const total = await KYCDocument.countDocuments(filter);
    
    const result = {
      success: true,
      kycDocs,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
        totalRecords: total
      }
    };
    
    // Cache the result
    adminCache.set(cacheKey, result);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getPendingKYCs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Approve KYC document
export const approveKYC = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!id) {
      return res.status(400).json({ message: 'KYC ID is required' });
    }
    
    // Find KYC document
    const kycDoc = await KYCDocument.findById(id);
    
    if (!kycDoc) {
      return res.status(404).json({ message: 'KYC document not found' });
    }
    
    // Update KYC status
    kycDoc.status = 'APPROVED';
    await kycDoc.save();
    
    // Update user's KYC status
    const user = await User.findById(kycDoc.userId);
    if (user) {
      user.kycStatus = 'APPROVED';
      await user.save();
    }
    
    // Clear admin cache since we have updated data
    adminCache.clear();
    
    res.status(200).json({
      success: true,
      message: 'KYC approved successfully',
      kycDoc
    });
  } catch (error) {
    console.error('Error in approveKYC:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all deliveries
export const getAllDeliveries = async (req, res) => {
  try {
    const { limit = 10, page = 1, status } = req.query;
    
    // Validate and sanitize inputs
    const parsedLimit = Math.min(parseInt(limit) || 10, 50); // Max 50 items per page
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    
    // Build cache key
    const cacheKey = `deliveries_${status || 'all'}_${parsedPage}_${parsedLimit}`;
    
    // Check cache first
    const cachedDeliveries = adminCache.get(cacheKey);
    if (cachedDeliveries) {
      return res.status(200).json(cachedDeliveries);
    }
    
    // Build filter
    const filter = {};
    if (status) {
      filter.status = status;
    }
    
    // Pagination
    const skip = (parsedPage - 1) * parsedLimit;
    
    // Use projection for better performance
    const deliveries = await Delivery.find(filter, {
      requestId: 1,
      travelerId: 1,
      status: 1,
      pickupTime: 1,
      dropTime: 1,
      createdAt: 1
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(); // Use lean() for better performance
    
    const total = await Delivery.countDocuments(filter);
    
    const result = {
      success: true,
      deliveries,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
        totalRecords: total
      }
    };
    
    // Cache the result
    adminCache.set(cacheKey, result);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getAllDeliveries:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const { limit = 10, page = 1, role } = req.query;
    
    // Validate and sanitize inputs
    const parsedLimit = Math.min(parseInt(limit) || 10, 50); // Max 50 items per page
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    
    // Build cache key
    const cacheKey = `users_${role || 'USER'}_${parsedPage}_${parsedLimit}`;
    
    // Check cache first
    const cachedUsers = adminCache.get(cacheKey);
    if (cachedUsers) {
      return res.status(200).json(cachedUsers);
    }
    
    // Build filter
    const filter = { role: 'USER' };
    if (role) {
      filter.role = role;
    }
    
    // Pagination
    const skip = (parsedPage - 1) * parsedLimit;
    
    // Use projection for better performance
    const users = await User.find(filter, {
      name: 1,
      phone: 1,
      email: 1,
      role: 1,
      kycStatus: 1,
      createdAt: 1
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(); // Use lean() for better performance
    
    const total = await User.countDocuments(filter);
    
    const result = {
      success: true,
      users,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
        totalRecords: total
      }
    };
    
    // Cache the result
    adminCache.set(cacheKey, result);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all travelers
export const getAllTravelers = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    
    // Validate and sanitize inputs
    const parsedLimit = Math.min(parseInt(limit) || 10, 50); // Max 50 items per page
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    
    // Build cache key
    const cacheKey = `travelers_${parsedPage}_${parsedLimit}`;
    
    // Check cache first
    const cachedTravelers = adminCache.get(cacheKey);
    if (cachedTravelers) {
      return res.status(200).json(cachedTravelers);
    }
    
    // Build filter
    const filter = { role: 'TRAVELER' };
    
    // Pagination
    const skip = (parsedPage - 1) * parsedLimit;
    
    // Use projection for better performance
    const travelers = await User.find(filter, {
      name: 1,
      phone: 1,
      email: 1,
      role: 1,
      kycStatus: 1,
      createdAt: 1
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(); // Use lean() for better performance
    
    const total = await User.countDocuments(filter);
    
    const result = {
      success: true,
      travelers,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
        totalRecords: total
      }
    };
    
    // Cache the result
    adminCache.set(cacheKey, result);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getAllTravelers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};