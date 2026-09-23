const mongoose = require('mongoose');

const cashbackClaimSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true },
    amazonOrderId: { type: String, default: 'Awaiting Amazon Sync' },
    purchaseAmount: { type: Number, required: true },
    cashbackPercentage: { type: Number, default: 0.25 },
    cashbackAmount: { type: Number, required: true }, // Auto calculated 0.25%
    purchaseDate: { type: Date, default: Date.now },
    upiId: { type: String, required: true },
    status: {
      type: String,
      enum: ['CLICKED', 'PENDING', 'APPROVED', 'REJECTED', 'PAID'],
      default: 'CLICKED', // Auto 1-click status
      index: true,
    },
    adminNotes: { type: String, default: '' },
    payoutDetails: {
      utrNumber: { type: String, default: null },
      paidAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CashbackClaim', cashbackClaimSchema);