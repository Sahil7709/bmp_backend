import mongoose from 'mongoose';

const kycDocumentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  docType: {
    type: String,
    required: true,
    enum: ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE']
  },
  docUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
kycDocumentSchema.index({ userId: 1 });
kycDocumentSchema.index({ status: 1 });

const KYCDocument = mongoose.model('KYCDocument', kycDocumentSchema);

export default KYCDocument;