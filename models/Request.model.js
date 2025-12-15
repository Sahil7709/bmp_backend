import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pickup: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  drop: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  parcelInfo: {
    weight: { type: Number, required: true },
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    description: { type: String, required: true },
    fragile: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ['PENDING', 'MATCHED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
requestSchema.index({ sender: 1 });
requestSchema.index({ status: 1 });
requestSchema.index({ 'pickup.lat': 1, 'pickup.lng': 1 });
requestSchema.index({ 'drop.lat': 1, 'drop.lng': 1 });

const Request = mongoose.model('Request', requestSchema);

export default Request;