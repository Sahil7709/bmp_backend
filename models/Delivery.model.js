import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  travelerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pickupOtpHash: {
    type: String,
    required: true
  },
  dropOtpHash: {
    type: String,
    required: true
  },
  pickupTime: {
    type: Date,
    default: null
  },
  dropTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['ACCEPTED', 'PICKED_UP', 'DELIVERED'],
    default: 'ACCEPTED'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
deliverySchema.index({ requestId: 1 });
deliverySchema.index({ travelerId: 1 });
deliverySchema.index({ status: 1 });

const Delivery = mongoose.model('Delivery', deliverySchema);

export default Delivery;