const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  checkIn,
  checkOut,
  getStatus,
} = require('../controllers/checkinoutController');

// All routes require authentication
router.use(protect);

// Check-in / Check-out for a specific booking
router.post('/:bookingId/checkin', checkIn);
router.post('/:bookingId/checkout', checkOut);
router.get('/:bookingId/status', getStatus);

module.exports = router;