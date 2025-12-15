import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deliveryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Geospatial index for location-based queries
locationSchema.index({ location: '2dsphere' });
locationSchema.index({ deliveryId: 1 });
locationSchema.index({ userId: 1 });

const Location = mongoose.model('Location', locationSchema);

export default Location;