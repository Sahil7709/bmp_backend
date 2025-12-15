import Request from '../models/Request.model.js';
import Match from '../models/Match.model.js';

// In-memory cache for requests
class RequestCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 30000; // 30 seconds
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

const requestCache = new RequestCache();

// Create a new parcel request
export const createRequest = async (req, res) => {
  try {
    const { pickup, drop, parcelInfo } = req.body;
    
    // Validate required fields
    if (!pickup || !drop || !parcelInfo) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate coordinates
    if (isNaN(pickup.lat) || isNaN(pickup.lng) || isNaN(drop.lat) || isNaN(drop.lng)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }
    
    // Create new request
    const newRequest = new Request({
      sender: req.user.id,
      pickup,
      drop,
      parcelInfo
    });
    
    await newRequest.save();
    
    // Clear cache for this user since we have a new request
    requestCache.clear();
    
    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('Error in createRequest:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get request by ID
export const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check cache first
    const cacheKey = `request_${id}`;
    const cachedRequest = requestCache.get(cacheKey);
    if (cachedRequest) {
      return res.status(200).json({
        success: true,
        request: cachedRequest
      });
    }
    
    const request = await Request.findById(id)
      .populate('sender', 'name phone email');
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if user is authorized to view this request
    if (request.sender._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Cache the result
    requestCache.set(cacheKey, request);
    
    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Error in getRequestById:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Search requests
export const searchRequests = async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    
    // Validate and sanitize inputs
    const parsedLimit = Math.min(parseInt(limit) || 10, 50); // Max 50 items per page
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    
    // Build cache key
    const cacheKey = `requests_${req.user.id}_${status || 'all'}_${parsedPage}_${parsedLimit}`;
    
    // Check cache first
    const cachedResult = requestCache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
    }
    
    // Build filter
    const filter = { sender: req.user.id };
    if (status) {
      filter.status = status;
    }
    
    // Pagination
    const skip = (parsedPage - 1) * parsedLimit;
    
    // Use projection to limit fields returned
    const requests = await Request.find(filter, {
      'pickup.lat': 1,
      'pickup.lng': 1,
      'drop.lat': 1,
      'drop.lng': 1,
      'parcelInfo.description': 1,
      'parcelInfo.weight': 1,
      status: 1,
      createdAt: 1
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(); // Use lean() for better performance
    
    const total = await Request.countDocuments(filter);
    
    const result = {
      success: true,
      requests,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
        totalRecords: total
      }
    };
    
    // Cache the result
    requestCache.set(cacheKey, result);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in searchRequests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};