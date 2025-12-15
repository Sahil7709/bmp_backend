import dotenv from 'dotenv';
import { createServer } from 'http';
import app from './app.js';
import { initSocket } from './config/socket.js';
import SocketService from './services/socket.service.js';

// Load environment variables
dotenv.config();

// Create HTTP server
const server = createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Initialize SocketService
const socketService = new SocketService(io);

// Store io instance and socketService in app locals for access in routes
app.locals.io = io;
app.locals.socketService = socketService;

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-delivery', (deliveryId) => {
    socket.join(deliveryId);
    console.log(`User joined room: ${deliveryId}`);
  });
  
  socket.on('position-update', (data) => {
    // Broadcast position to all clients in the delivery room
    socket.to(data.deliveryId).emit('location-update', data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});