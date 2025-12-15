import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
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
  fareOffered: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    default: 'PENDING'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
matchSchema.index({ requestId: 1 });
matchSchema.index({ travelerId: 1 });
matchSchema.index({ status: 1 });

const Match = mongoose.model('Match', matchSchema);

export default Match;