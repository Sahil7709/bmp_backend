# Book My Parcel - Backend

This is the backend API for the Book My Parcel logistics platform.

## Tech Stack

- Node.js with Express.js
- MongoDB with Mongoose
- JWT for authentication
- Socket.IO for real-time tracking
- Twilio for OTP (simulated)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (see .env.example)

3. Start the development server:
   ```bash
   npm run dev
   ```

   Or for production:
   ```bash
   npm start
   ```

## Folder Structure

- `models/` - MongoDB models
- `controllers/` - Request handlers
- `routes/` - API routes
- `middlewares/` - Auth and role middlewares
- `services/` - Business logic services
- `utils/` - Helper functions
- `config/` - Configuration files
- `server.js` - Entry point

## API Documentation

### Authentication
- `POST /api/auth/request-otp` - Request OTP
- `POST /api/auth/verify-otp` - Verify OTP and login

### User Routes
- `POST /api/user/requests` - Create parcel request
- `GET /api/user/requests/:id` - Get request by ID
- `GET /api/user/requests/search` - Search requests

### Traveler Routes
- `GET /api/traveler/feed` - Get available requests
- `POST /api/traveler/accept/:matchId` - Accept a match
- `POST /api/traveler/delivery/pickup-otp` - Verify pickup OTP
- `POST /api/traveler/delivery/drop-otp` - Verify drop OTP

### Admin Routes
- `GET /api/admin/kyc/pending` - Get pending KYC documents
- `POST /api/admin/kyc/approve/:id` - Approve KYC document
- `GET /api/admin/deliveries` - Get all deliveries
- `GET /api/admin/users` - Get all users
- `GET /api/admin/travelers` - Get all travelers

### Tracking
- `POST /api/tracking/location/update` - Update location
- WebSocket namespace: `/ws/tracker`

## Environment Variables

Create a `.env` file in the root of the server directory with the following variables:

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/bookmyparcel
JWT_SECRET=your_jwt_secret_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
FRONTEND_URL=http://localhost:5173
```

## Database Models

### User
- name: String
- phone: String (unique)
- email: String (unique)
- role: String (USER/TRAVELER/ADMIN)
- passwordHash: String (optional)
- kycStatus: String (PENDING/APPROVED/REJECTED)

### KYCDocument
- userId: ObjectId (ref: User)
- docType: String (AADHAAR/PAN/PASSPORT/DRIVING_LICENSE)
- docUrl: String
- status: String (PENDING/APPROVED/REJECTED)

### Request
- sender: ObjectId (ref: User)
- pickup: Object {lat, lng}
- drop: Object {lat, lng}
- parcelInfo: Object {weight, dimensions, description, fragile}
- status: String (PENDING/MATCHED/ACCEPTED/PICKED_UP/DELIVERED/CANCELLED)

### Match
- requestId: ObjectId (ref: Request)
- travelerId: ObjectId (ref: User)
- fareOffered: Number
- status: String (PENDING/ACCEPTED/REJECTED)

### Delivery
- requestId: ObjectId (ref: Request)
- travelerId: ObjectId (ref: User)
- pickupOtpHash: String
- dropOtpHash: String
- pickupTime: Date
- dropTime: Date
- status: String (ACCEPTED/PICKED_UP/DELIVERED)

### Location
- userId: ObjectId (ref: User)
- deliveryId: ObjectId (ref: Delivery)
- lat: Number
- lng: Number
- timestamp: Date"# bmp_backend" 
