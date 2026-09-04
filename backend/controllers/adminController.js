const User = require("../models/User");
const Building = require("../models/Building");
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const mongoose = require("mongoose");

// ── USERS ────────────────────────────────────────────

// GET all users (with pagination, role filter, search)
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};

    if (role && role !== "all") filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });
    const total = await User.countDocuments(filter);

    res.json({ users, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET single user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create a new user (admin only)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, address, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists." });

    const user = new User({ name, email, password, role, address, phone });
    await user.save();
    // Return without password
    const { password: _, ...userData } = user.toObject();
    res.status(201).json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update user (name, email, role, address, phone, isActive)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, address, phone, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.address = address !== undefined ? address : user.address;
    user.phone = phone !== undefined ? phone : user.phone;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    const { password: _, ...userData } = user.toObject();
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE user (hard delete)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ message: "User deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH toggle suspension (flip isActive)
exports.toggleSuspension = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? "activated" : "suspended"}.`, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── BUILDINGS ──────────────────────────────────────────

// GET all buildings (with owner populated)
exports.getBuildings = async (req, res) => {
  try {
    const buildings = await Building.find().populate("ownerId", "name email").sort({ createdAt: -1 });
    res.json(buildings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── SLOTS ──────────────────────────────────────────────

// GET all slots (with building and owner populated, optional filters)
exports.getSlots = async (req, res) => {
  try {
    const { building, status, type } = req.query;
    const filter = {};
    if (building) filter.building = building;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const slots = await Slot.find(filter)
      .populate("building", "name")
      .populate("owner", "name email")
      .sort({ createdAt: -1 });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── BOOKINGS ────────────────────────────────────────────

// GET all bookings (with renter and slot populated, filters)
exports.getBookings = async (req, res) => {
  try {
    const { status, from, to, renter } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (renter) filter.renterId = renter;
    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) filter.startTime.$lte = new Date(to);
    }

    const bookings = await Booking.find(filter)
      .populate("renterId", "name email")
      .populate({ path: "slotId", populate: { path: "building", select: "name" } })
      .sort({ startTime: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH cancel any booking (admin override)
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    if (booking.status === "cancelled") return res.status(400).json({ error: "Already cancelled." });

    booking.status = "cancelled";
    await booking.save();

    // Free the slot
    const slot = await Slot.findById(booking.slotId);
    if (slot && slot.status !== "inactive") {
      slot.status = "available";
      await slot.save();
    }

    res.json({ message: "Booking cancelled by admin.", booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── SYSTEM STATS ────────────────────────────────────────

exports.getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const admins = await User.countDocuments({ role: "admin" });
    const owners = await User.countDocuments({ role: "owner" });
    const renters = await User.countDocuments({ role: "renter" });
    const totalBuildings = await Building.countDocuments();
    const totalSlots = await Slot.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({ status: { $in: ["confirmed", "active"] } });
    // Total revenue: sum of totalAmount from completed bookings
    const revenueResult = await Booking.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    res.json({
      users: { total: totalUsers, admins, owners, renters },
      buildings: totalBuildings,
      slots: totalSlots,
      bookings: { total: totalBookings, active: activeBookings },
      revenue: totalRevenue,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};