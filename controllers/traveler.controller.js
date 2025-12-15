import Request from '../models/Request.model.js';
import Match from '../models/Match.model.js';
import Delivery from '../models/Delivery.model.js';
import { generateOTP } from '../utils/otp.utils.js';
import { hashOTP, compareOTP } from '../utils/bcrypt.utils.js';

// In-memory cache for feed
class FeedCache {
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

const feedCache = new FeedCache();

// Get feed of available requests
export const getFeed = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    
    // Validate and sanitize inputs
    const parsedLimit = Math.min(parseInt(limit) || 10, 50); // Max 50 items per page
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    
    // Build cache key
    const cacheKey = `feed_${parsedPage}_${parsedLimit}`;
    
    // Check cache first
    const cachedFeed = feedCache.get(cacheKey);
    if (cachedFeed) {
      return res.status(200).json(cachedFeed);
    }
    
    // Find requests with PENDING status
    const filter = { status: 'PENDING' };
    
    // Pagination
    const skip = (parsedPage - 1) * parsedLimit;
    
    // Use projection to limit fields returned for better performance
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
    feedCache.set(cacheKey, result);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getFeed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Accept a match
export const acceptMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { fareOffered } = req.body;
    
    // Validate matchId
    if (!matchId) {
      return res.status(400).json({ message: 'Match ID is required' });
    }
    
    // Validate fareOffered
    const parsedFare = parseFloat(fareOffered);
    if (isNaN(parsedFare) || parsedFare <= 0) {
      return res.status(400).json({ message: 'Valid fare is required' });
    }
    
    // Find the match with session for transaction
    const match = await Match.findById(matchId)
      .populate('requestId');
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    // Check if request is still pending
    if (match.requestId.status !== 'PENDING') {
      return res.status(400).json({ message: 'Request is no longer available' });
    }
    
    // Check if match is already accepted
    if (match.status === 'ACCEPTED') {
      return res.status(400).json({ message: 'Match already accepted' });
    }
    
    // Update match status
    match.status = 'ACCEPTED';
    match.fareOffered = parsedFare;
    await match.save();
    
    // Update request status
    match.requestId.status = 'MATCHED';
    await match.requestId.save();
    
    // Create delivery record
    const pickupOTP = generateOTP();
    const dropOTP = generateOTP();
    
    const pickupOtpHash = await hashOTP(pickupOTP);
    const dropOtpHash = await hashOTP(dropOTP);
    
    const delivery = new Delivery({
      requestId: match.requestId._id,
      travelerId: req.user.id,
      pickupOtpHash,
      dropOtpHash
    });
    
    await delivery.save();
    
    // Clear feed cache since we have a new match
    feedCache.clear();
    
    res.status(200).json({
      success: true,
      message: 'Match accepted successfully',
      delivery,
      otps: {
        pickupOTP,
        dropOTP
      }
    });
  } catch (error) {
    console.error('Error in acceptMatch:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify pickup OTP
export const verifyPickupOTP = async (req, res) => {
  try {
    const { deliveryId, otp } = req.body;
    
    // Validate inputs
    if (!deliveryId || !otp) {
      return res.status(400).json({ message: 'Delivery ID and OTP are required' });
    }
    
    // Validate OTP format
    const otpRegex = /^[0-9]{6}$/;
    if (!otpRegex.test(otp)) {
      return res.status(400).json({ message: 'Invalid OTP format' });
    }
    
    // Find delivery
    const delivery = await Delivery.findById(deliveryId);
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }
    
    // Check if delivery belongs to traveler
    if (delivery.travelerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check if delivery is in ACCEPTED status
    if (delivery.status !== 'ACCEPTED') {
      return res.status(400).json({ message: 'Delivery is not in ACCEPTED status' });
    }
    
    // Verify OTP
    const isMatch = await compareOTP(otp, delivery.pickupOtpHash);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Update delivery status
    delivery.status = 'PICKED_UP';
    delivery.pickupTime = new Date();
    await delivery.save();
    
    res.status(200).json({
      success: true,
      message: 'Pickup verified successfully',
      delivery
    });
  } catch (error) {
    console.error('Error in verifyPickupOTP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify drop OTP
export const verifyDropOTP = async (req, res) => {
  try {
    const { deliveryId, otp } = req.body;
    
    // Validate inputs
    if (!deliveryId || !otp) {
      return res.status(400).json({ message: 'Delivery ID and OTP are required' });
    }
    
    // Validate OTP format
    const otpRegex = /^[0-9]{6}$/;
    if (!otpRegex.test(otp)) {
      return res.status(400).json({ message: 'Invalid OTP format' });
    }
    
    // Find delivery
    const delivery = await Delivery.findById(deliveryId);
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }
    
    // Check if delivery belongs to traveler
    if (delivery.travelerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check if delivery is in PICKED_UP status
    if (delivery.status !== 'PICKED_UP') {
      return res.status(400).json({ message: 'Delivery is not in PICKED_UP status' });
    }
    
    // Verify OTP
    const isMatch = await compareOTP(otp, delivery.dropOtpHash);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Update delivery status
    delivery.status = 'DELIVERED';
    delivery.dropTime = new Date();
    await delivery.save();
    
    // Update request status
    const request = await Request.findById(delivery.requestId);
    if (request) {
      request.status = 'DELIVERED';
      await request.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Drop verified successfully',
      delivery
    });
  } catch (error) {
    console.error('Error in verifyDropOTP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};