// Socket.IO service for handling real-time events
class SocketService {
  constructor(io) {
    this.io = io;
    this.initializeEvents();
  }

  initializeEvents() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join a delivery tracking room
      socket.on('join-delivery', (deliveryId) => {
        socket.join(deliveryId);
        console.log(`User ${socket.id} joined delivery room: ${deliveryId}`);
      });

      // Handle location updates with throttling
      socket.on('position-update', (data) => {
        // Throttle location updates to prevent excessive broadcasting
        this.throttleLocationUpdate(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }

  // Throttle location updates to prevent excessive broadcasting
  throttleLocationUpdate(socket, data) {
    // In a production environment, you might want to implement rate limiting
    // For now, we'll broadcast immediately but with error handling
    try {
      // Broadcast to all clients in the delivery room except sender
      socket.to(data.deliveryId).emit('location-update', data);
    } catch (error) {
      console.error('Error broadcasting location update:', error);
    }
  }

  // Emit location update to a specific delivery room
  emitLocationUpdate(deliveryId, locationData) {
    this.io.to(deliveryId).emit('location-update', locationData);
  }

  // Emit delivery status update
  emitDeliveryStatusUpdate(deliveryId, statusData) {
    this.io.to(deliveryId).emit('delivery-status-update', statusData);
  }

  // Get number of connected clients
  getConnectedClients() {
    return this.io.engine.clientsCount;
  }

  // Get rooms and their client counts
  getRoomsInfo() {
    const rooms = new Map();
    for (const [roomId, room] of this.io.sockets.adapter.rooms) {
      // Skip private rooms (socket.id rooms)
      if (!this.io.sockets.sockets.has(roomId)) {
        rooms.set(roomId, room.size);
      }
    }
    return rooms;
  }
}

export default SocketService;