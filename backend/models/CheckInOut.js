const mongoose = require('mongoose');

const checkInOutSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    checkInTime: {
      type: Date,
      default: null,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    // Optional: store the status to track if already checked out
    status: {
      type: String,
      enum: ['pending', 'checked-in', 'checked-out'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CheckInOut', checkInOutSchema);