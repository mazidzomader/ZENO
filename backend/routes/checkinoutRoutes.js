const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  checkIn,
  checkOut,
  getStatus,
} = require('../controllers/checkinoutController');

const OverstayPenalty = require('../models/OverstayPenalty');
const Booking = require('../models/Booking');
const Stripe = require('stripe');

let _stripe = null;
const getStripe = () => {
  if (!_stripe) _stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
};

// All routes require authentication
router.use(protect);

// Check-in / Check-out for a specific booking
router.post('/:bookingId/checkin', checkIn);
router.post('/:bookingId/checkout', checkOut);
router.get('/:bookingId/status', getStatus);

// POST /api/checkinout/penalty/:penaltyId/pay
router.post('/penalty/:penaltyId/pay', protect, async (req, res) => {
  try {
    const { penaltyId } = req.params;
    const userId = req.user._id;

    const penalty = await OverstayPenalty.findById(penaltyId);
    if (!penalty) {
      return res.status(404).json({ error: 'Penalty not found.' });
    }
    if (penalty.paid) {
      return res.status(400).json({ error: 'Penalty already paid.' });
    }

    const booking = await Booking.findById(penalty.bookingId);
    if (!booking || String(booking.renterId) !== String(userId)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const amountInCents = Math.round(penalty.penaltyAmount * 100);
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Overstay Penalty – Booking #${String(booking._id).slice(-6)}`,
              description: `${penalty.overstayDuration} min overstay, $${penalty.penaltyAmount}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'penalty',
        penaltyId: String(penalty._id),
        bookingId: String(booking._id),
        renterId: String(userId),
      },
      success_url: `${process.env.CLIENT_URL}/payment/penalty-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/collections/overstaypenalties`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Pay penalty error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;