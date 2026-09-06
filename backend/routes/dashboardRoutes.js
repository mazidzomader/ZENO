// ZENO — Dashboard Summary (Feature: Dashboard)
// GET /api/dashboard/summary → Aggregated role-based stats for the logged-in user

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { protect } = require("../middleware/authMiddleware");

const toId = (id) => new mongoose.Types.ObjectId(String(id));

// ── GET /api/dashboard/summary ───────────────────────────────────────────────
// Returns aggregated dashboard summary for the logged-in user (role-aware)
router.get("/summary", protect, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const userId = toId(req.user._id);

    if (req.user.role === "renter") {
      // 1. Determine active status
      const now = new Date();
      const activeBooking = await db.collection("bookings").findOne({
        renterId: userId,
        status: "confirmed",
        startTime: { $lte: now },
        endTime: { $gte: now }
      });
      const status = activeBooking ? "Parked" : "No active booking";

      // 2. Fetch user's vehicles
      const vehicles = await db.collection("vehicles").find({ 
        $or: [{ userId: userId }, { renterId: userId }] 
      }).toArray();

      // 3. Fetch reviews and calculate average rating
      const reviews = await db.collection("reviews").find({ renterId: userId }).toArray();
      const avgRating = reviews.length > 0
        ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
        : "N/A";

      // 4. Extra stats
      const totalInvoices = await db.collection("invoices").countDocuments({ renterId: userId });
      const totalBookings = await db.collection("bookings").countDocuments({ renterId: userId });

      const renterBookings = await db
        .collection("bookings")
        .find({ renterId: userId }, { projection: { _id: 1 } })
        .toArray();
      const bookingIds = renterBookings.map((b) => b._id);

      const payments = await db.collection("payments").find({
        bookingId: { $in: bookingIds },
        status: "success"
      }).toArray();
      const totalSpent = payments.reduce((acc, pay) => acc + pay.amount, 0);

      return res.json({
        role: "renter",
        status,
        vehicles: vehicles.map(v => ({ plateNumber: v.plateNumber, type: v.type, sizeClass: v.sizeClass })),
        avgRating,
        totalInvoices,
        totalBookings,
        totalSpent
      });
    }

    if (req.user.role === "owner") {
      // 1. Fetch buildings owned by this owner
      const buildings = await db.collection("buildings").find({ ownerId: userId }).toArray();
      const buildingIds = buildings.map((b) => b._id);

      // 2. Fetch slots in these buildings
      const slots = await db.collection("parkingslots").find({ building: { $in: buildingIds } }).toArray();
      const slotIds = slots.map((s) => s._id);

      // 3. Fetch bookings for these slots
      const bookings = await db.collection("bookings").find({ slotId: { $in: slotIds } }).toArray();
      const bookingIds = bookings.map((b) => b._id);

      // 4. Fetch reviews for these bookings
      const reviews = await db.collection("reviews").find({ bookingId: { $in: bookingIds } }).toArray();

      // 5. Calculate average rating
      const avgRating = reviews.length > 0
        ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
        : "N/A";

      // 6. Calculate total earned from successful payments
      const payments = await db.collection("payments").find({
        bookingId: { $in: bookingIds },
        status: "success"
      }).toArray();
      const totalEarned = payments.reduce((acc, pay) => acc + Number(pay.amount || 0), 0);

      // 7. Owner analytics: occupancy, peak hours, and per-slot performance
      const totalSlots = slots.length;
      const occupiedSlots = slots.filter((slot) => slot.status === "occupied").length;
      const reservedSlots = slots.filter((slot) => slot.status === "reserved").length;
      const availableSlots = slots.filter((slot) => slot.status === "available").length;
      const occupancyRate = totalSlots > 0
        ? Number(((occupiedSlots / totalSlots) * 100).toFixed(1))
        : 0;

      const activeBookings = bookings.filter((booking) =>
        ["confirmed", "active"].includes(booking.status)
      ).length;
      const completedBookings = bookings.filter((booking) => booking.status === "completed").length;

      const hourlyCounts = Array.from({ length: 24 }, () => 0);
      bookings.forEach((booking) => {
        const start = booking.startTime ? new Date(booking.startTime) : null;
        if (start && !Number.isNaN(start.getTime())) {
          hourlyCounts[start.getHours()] += 1;
        }
      });
      const peakUsageHours = hourlyCounts
        .map((count, hour) => ({
          hour,
          label: `${String(hour).padStart(2, "0")}:00`,
          bookings: count,
        }))
        .filter((item) => item.bookings > 0)
        .sort((a, b) => b.bookings - a.bookings || a.hour - b.hour)
        .slice(0, 5);

      const paidAmountByBooking = new Map();
      payments.forEach((payment) => {
        const key = String(payment.bookingId);
        paidAmountByBooking.set(
          key,
          (paidAmountByBooking.get(key) || 0) + Number(payment.amount || 0)
        );
      });

      const perSlotPerformance = slots.map((slot) => {
        const slotBookings = bookings.filter(
          (booking) => String(booking.slotId) === String(slot._id)
        );
        const revenue = slotBookings.reduce(
          (sum, booking) => sum + (paidAmountByBooking.get(String(booking._id)) || 0),
          0
        );
        return {
          slotId: slot._id,
          slotNumber: slot.slotNumber,
          floor: slot.floor,
          status: slot.status,
          bookings: slotBookings.length,
          revenue,
        };
      }).sort((a, b) => b.bookings - a.bookings || b.revenue - a.revenue);

      // 8. Get user profile data to return
      const userDoc = await db.collection("users").findOne({ _id: userId });

      // 9. Fetch the 3 most recent reviews for the owner reviews feed
      const recentReviews = [];
      const sortedReviews = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      for (const rev of sortedReviews.slice(0, 3)) {
        const b = bookings.find(b => b._id.toString() === rev.bookingId.toString());
        const s = b ? slots.find(s => s._id.toString() === b.slotId.toString()) : null;
        recentReviews.push({
          rating: rev.rating,
          comment: rev.comment,
          createdAt: rev.createdAt,
          slotNumber: s ? s.slotNumber : "Unknown"
        });
      }

      return res.json({
        role: "owner",
        avgRating,
        totalBuildings: buildings.length,
        totalSlots,
        totalBookings: bookings.length,
        totalEarned,
        occupiedSlots,
        reservedSlots,
        availableSlots,
        occupancyRate,
        activeBookings,
        completedBookings,
        peakUsageHours,
        perSlotPerformance,
        recentReviews,
        profile: {
          address: userDoc.address || "",
          coordinates: userDoc.coordinates || "",
          phone: userDoc.phone || "",
          ownerCode: userDoc.ownerCode || `OWNER-${userId.toString().slice(-6).toUpperCase()}`
        }
      });
    }

    // Fallback for admin
    return res.json({
      role: req.user.role,
      message: `${req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)} dashboard features coming soon.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
