const mongoose = require('mongoose');

const overstayPenaltySchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    // Overstay duration in minutes
    overstayDuration: {
      type: Number,
      required: true,
    },
    // Penalty amount in currency
    penaltyAmount: {
      type: Number,
      required: true,
    },
    // The rate used (per hour) for the penalty calculation
    penaltyRatePerHour: {
      type: Number,
      required: true,
    },
    // Optional: notes about the calculation
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OverstayPenalty', overstayPenaltySchema);