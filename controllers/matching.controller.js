import Request from '../models/Request.model.js';
import User from '../models/User.model.js';
import Match from '../models/Match.model.js';
import MatchingService from '../services/matching.service.js';

// In-memory cache for matching results
class MatchingCache {
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
    if (this.cache.size > 50) { // Limit cache size
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  clear() {
    this.cache.clear();
  }
}

const matchingCache = new MatchingCache();

// Get matches for a specific request
export const getMatchesForRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Validate request ID
    if (!requestId) {
      return res.status(400).json({ message: 'Request ID is required' });
    }
    
    // Build cache key
    const cacheKey = `matches_${requestId}_${req.user.id}`;
    
    // Check cache first
    const cachedMatches = matchingCache.get(cacheKey);
    if (cachedMatches) {
      return res.status(200).json(cachedMatches);
    }
    
    // Find the request
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if user is authorized to view matches for this request
    if (request.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find travelers (users with TRAVELER role) with lean() for better performance
    const travelers = await User.find({ role: 'TRAVELER' }, {
      currentLocation: 1,
      destination: 1,
      role: 1
    }).lean();
    
    // Get potential matches
    const matches = MatchingService.matchRequests([request], travelers);
    
    const result = {
      success: true,
      matches
    };
    
    // Cache the result
    matchingCache.set(cacheKey, result);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getMatchesForRequest:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create matches for all pending requests
export const createMatches = async (req, res) => {
  try {
    // Only admins can manually trigger matching
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Build cache key for pending requests
    const cacheKey = 'pending_requests_matches';
    
    // Check cache first
    const cachedResult = matchingCache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
    }
    
    // Find all pending requests with lean() for better performance
    const requests = await Request.find({ status: 'PENDING' }, {
      pickup: 1,
      drop: 1,
      status: 1,
      sender: 1
    }).lean();
    
    // Find all travelers with lean() for better performance
    const travelers = await User.find({ role: 'TRAVELER' }, {
      currentLocation: 1,
      destination: 1,
      role: 1
    }).lean();
    
    // Get matches
    const matches = MatchingService.matchRequests(requests, travelers);
    
    // Save matches to database using bulk insert for better performance
    const matchDocs = matches.map(match => ({
      requestId: match.requestId,
      travelerId: match.travelerId,
      status: 'PENDING'
    }));
    
    const savedMatches = await Match.insertMany(matchDocs);
    
    const result = {
      success: true,
      message: `Created ${savedMatches.length} matches`,
      matches: savedMatches
    };
    
    // Cache the result
    matchingCache.set(cacheKey, result);
    
    // Clear matching cache since we have new matches
    matchingCache.clear();
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in createMatches:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};