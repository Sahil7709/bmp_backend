import Location from '../models/Location.model.js';

// In-memory cache for recent location updates to reduce database load
const locationCache = new Map();
const CACHE_TTL = 5000; // 5 seconds

// Update location
export const updateLocation = async (req, res) => {
  try {
    const { deliveryId, lat, lng } = req.body;
    
    // Validate required fields
    if (!deliveryId || !lat || !lng) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check cache first to reduce database load
    const cacheKey = `${deliveryId}-${lat}-${lng}`;
    const cached = locationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // Return cached response
      return res.status(200).json({
        success: true,
        message: 'Location updated successfully (cached)',
        location: cached.location
      });
    }
    
    // Create new location record
    const location = new Location({
      userId: req.user.id,
      deliveryId,
      lat,
      lng
    });
    
    await location.save();
    
    // Cache the result
    locationCache.set(cacheKey, {
      timestamp: Date.now(),
      location
    });
    
    // Clean up old cache entries
    for (const [key, value] of locationCache.entries()) {
      if (Date.now() - value.timestamp > CACHE_TTL) {
        locationCache.delete(key);
      }
    }
    
    // Emit location update using socket service
    const socketService = req.app.locals.socketService;
    if (socketService) {
      socketService.emitLocationUpdate(deliveryId, {
        deliveryId,
        lat,
        lng,
        timestamp: location.timestamp
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Location updated successfully',
      location
    });
  } catch (error) {
    console.error('Error in updateLocation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};