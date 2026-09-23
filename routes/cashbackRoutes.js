const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const CashbackClaim = require('../models/CashbackClaim');
const User = require('../models/User');

// ⚡ AUTOMATIC 1-CLICK INTENT: Click karte hi Admin panel mein save karega
router.post('/intent', protect, async (req, res) => {
  try {
    const { productId, productName, purchaseAmount } = req.body;

    const amountNum = parseFloat(purchaseAmount) || 0;
    const calculatedCashback = Math.round(amountNum * 0.0025 * 100) / 100; // 0.25%

    const claim = await CashbackClaim.create({
      userId: req.user._id,
      productId: productId || null,
      productName: productName || 'Amazon Product',
      purchaseAmount: amountNum,
      cashbackPercentage: 0.25,
      cashbackAmount: calculatedCashback,
      purchaseDate: new Date(),
      upiId: req.user.upiId || 'Pending UPI',
      status: 'CLICKED', // Auto recorded intent
    });

    res.status(201).json({ 
      success: true, 
      message: 'Cashback intent recorded successfully!', 
      data: claim 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Get all claims
router.get('/admin/claims', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const claims = await CashbackClaim.find(filter)
      .populate('userId', 'name mobile upiId totalCashbackPaid')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: claims });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Update Status & Enter UTR for Payment
router.patch('/admin/claims/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNotes, utrNumber } = req.body;
    const claim = await CashbackClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

    claim.status = status;
    if (adminNotes) claim.adminNotes = adminNotes;

    if (status === 'PAID') {
      if (!utrNumber) {
        return res.status(400).json({ success: false, message: 'UTR / Transaction Reference number is required' });
      }
      claim.payoutDetails = { utrNumber, paidAt: new Date() };
      await User.findByIdAndUpdate(claim.userId, {
        $inc: { totalCashbackPaid: claim.cashbackAmount },
      });
    }

    await claim.save();
    res.json({ success: true, message: `Status updated to ${status}`, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;