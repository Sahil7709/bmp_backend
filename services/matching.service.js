// Matching algorithm service for pairing users with travelers

class MatchingService {
  // Calculate distance between two points using Haversine formula
  // Optimized version with early exit and reduced calculations
  static calculateDistance(lat1, lon1, lat2, lon2) {
    // Early exit for same points
    if (lat1 === lat2 && lon1 === lon2) return 0;
    
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    // Use simpler calculation for small distances
    if (Math.abs(dLat) < 0.01 && Math.abs(dLon) < 0.01) {
      // For small distances, use Euclidean approximation
      const x = dLon * Math.cos((lat1 + lat2) / 2);
      return Math.sqrt(x * x + dLat * dLat) * R;
    }
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  static deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // Check if two routes are similar based on corridor matching
  // Optimized with early exits
  static areRoutesSimilar(userPickup, userDrop, travelerPickup, travelerDrop, threshold = 5) {
    // Early exit if any coordinate is missing
    if (!userPickup || !userDrop || !travelerPickup || !travelerDrop) {
      return false;
    }
    
    // Early exit if coordinates are invalid
    if (isNaN(userPickup.lat) || isNaN(userPickup.lng) || 
        isNaN(userDrop.lat) || isNaN(userDrop.lng) ||
        isNaN(travelerPickup.lat) || isNaN(travelerPickup.lng) ||
        isNaN(travelerDrop.lat) || isNaN(travelerDrop.lng)) {
      return false;
    }
    
    // Calculate distance between user pickup and traveler pickup
    const pickupDistance = this.calculateDistance(
      userPickup.lat, userPickup.lng,
      travelerPickup.lat, travelerPickup.lng
    );
    
    // Early exit if pickup distance exceeds threshold
    if (pickupDistance > threshold) return false;

    // Calculate distance between user drop and traveler drop
    const dropDistance = this.calculateDistance(
      userDrop.lat, userDrop.lng,
      travelerDrop.lat, travelerDrop.lng
    );

    // If both distances are within threshold, routes are similar
    return dropDistance <= threshold;
  }

  // Calculate detour distance for traveler
  static calculateDetour(userPickup, userDrop, travelerPickup, travelerDrop) {
    // Validate inputs
    if (!userPickup || !userDrop || !travelerPickup || !travelerDrop) {
      return Infinity;
    }
    
    // Original traveler distance
    const originalDistance = this.calculateDistance(
      travelerPickup.lat, travelerPickup.lng,
      travelerDrop.lat, travelerDrop.lng
    );
    
    // Early exit for invalid original distance
    if (originalDistance === 0 || isNaN(originalDistance)) {
      return Infinity;
    }

    // New distance with user pickup/drop
    const newUserDistance = this.calculateDistance(
      travelerPickup.lat, travelerPickup.lng,
      userPickup.lat, userPickup.lng
    ) + this.calculateDistance(
      userPickup.lat, userPickup.lng,
      userDrop.lat, userDrop.lng
    ) + this.calculateDistance(
      userDrop.lat, userDrop.lng,
      travelerDrop.lat, travelerDrop.lng
    );

    // Detour is the difference
    return newUserDistance - originalDistance;
  }

  // Match requests with travelers
  // Optimized with better filtering and limiting
  static matchRequests(requests, travelers) {
    const matches = [];
    
    // Early exit if no requests or travelers
    if (!requests || !travelers || requests.length === 0 || travelers.length === 0) {
      return matches;
    }

    // Limit the number of requests to process to prevent overload
    const maxRequests = Math.min(requests.length, 100);
    
    for (let i = 0; i < maxRequests; i++) {
      const request = requests[i];
      
      // Skip invalid requests
      if (!request || !request.pickup || !request.drop) continue;
      
      const userPickup = request.pickup;
      const userDrop = request.drop;

      const potentialMatches = [];
      
      // Limit the number of travelers to check
      const maxTravelers = Math.min(travelers.length, 100);
      
      for (let j = 0; j < maxTravelers; j++) {
        const traveler = travelers[j];
        
        // Skip invalid travelers
        if (!traveler) continue;
        
        const travelerPickup = traveler.currentLocation || traveler.pickup;
        const travelerDrop = traveler.destination;

        // Check if routes are similar
        if (this.areRoutesSimilar(userPickup, userDrop, travelerPickup, travelerDrop)) {
          // Calculate detour
          const detour = this.calculateDetour(userPickup, userDrop, travelerPickup, travelerDrop);

          // Add to potential matches if detour is reasonable
          if (detour <= 10 && detour >= 0) { // Max 10km detour and non-negative
            potentialMatches.push({
              travelerId: traveler._id || traveler.id,
              detour: detour
            });
            
            // Early exit if we have enough matches
            if (potentialMatches.length >= 10) break;
          }
        }
      }

      // Sort by minimal detour
      potentialMatches.sort((a, b) => a.detour - b.detour);

      // Add top matches to result (limit to 3)
      const topMatches = potentialMatches.slice(0, 3);
      topMatches.forEach(match => {
        matches.push({
          requestId: request._id || request.id,
          travelerId: match.travelerId,
          detour: match.detour
        });
      });
      
      // Early exit if we have enough total matches
      if (matches.length >= 50) break;
    }

    return matches;
  }
}

export default MatchingService;