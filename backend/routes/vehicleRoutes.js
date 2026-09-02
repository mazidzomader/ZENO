const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Auth Middleware
async function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "NO_TOKEN" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 

    // Fetch role from DB if teammate's token doesn't include it
    if (!req.user.role) {
      const userId = req.user.id || req.user._id || req.user.userId;
      if (userId) {
        const dbUser = await User.findById(userId);
        if (dbUser) {
          req.user.role = dbUser.role;
          req.user.id = dbUser._id;
        }
      }
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "FORBIDDEN_ROLE" });
    }
    next();
  };
}

/* ---------- MODELS ---------- */
const Vehicle =
  mongoose.models.Vehicle ||
  mongoose.model(
    "Vehicle",
    new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      renterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Legacy support
      plateNumber: { type: String, required: true, uppercase: true, trim: true },
      type: { type: String, required: true, trim: true }, // e.g., Sedan, SUV, Hatchback, Bike
      sizeClass: { type: String, enum: ["small", "medium", "large"], required: true },
      createdAt: { type: Date, default: Date.now }
    })
  );

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    new mongoose.Schema({
      name: String,
      email: String,
      role: String
    })
  );

const Building =
  mongoose.models.Building ||
  mongoose.model(
    "Building",
    new mongoose.Schema({
      ownerId: mongoose.Schema.Types.ObjectId,
      name: String,
      address: String
    })
  );

const ParkingSlot =
  mongoose.models.ParkingSlot ||
  mongoose.model(
    "ParkingSlot",
    new mongoose.Schema({
      buildingId: mongoose.Schema.Types.ObjectId,
      slotNumber: String
    })
  );

const Booking =
  mongoose.models.Booking ||
  mongoose.model(
    "Booking",
    new mongoose.Schema({
      renterId: mongoose.Schema.Types.ObjectId,
      slotId: mongoose.Schema.Types.ObjectId,
      vehicleId: mongoose.Schema.Types.ObjectId,
      startTime: Date,
      endTime: Date,
      status: String
    })
  );

/* ---------- ROUTE ENDPOINTS ---------- */

// GET /api/vehicles -> Vehicles registered to the logged-in user (Renter or Owner)
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const vehicles = await Vehicle.find({ 
      $or: [{ userId: userId }, { renterId: userId }] 
    }).sort({ createdAt: -1 });
    return res.json(vehicles);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// GET /api/vehicles/building -> owner-only
router.get("/building", verifyToken, requireRole("owner"), async (req, res) => {
  try {
    const ownerId = req.user.id || req.user._id;

    const buildings = await Building.find({ ownerId }).select("_id");
    const buildingIds = buildings.map((b) => b._id);

    // Support both 'buildingId' and 'building' based on teammate's schema
    const slots = await ParkingSlot.find({ 
      $or: [ { buildingId: { $in: buildingIds } }, { building: { $in: buildingIds } } ]
    }).select("_id");
    const slotIds = slots.map((s) => s._id);

    const bookings = await Booking.find({ slotId: { $in: slotIds } }).select("vehicleId");
    const vehicleIds = [...new Set(bookings.map((b) => String(b.vehicleId)).filter(Boolean))];

    const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } })
      .populate("userId", "name email role")
      .sort({ createdAt: -1 });

    return res.json(vehicles);
  } catch (err) {
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// GET /api/vehicles/all -> Admin-only: System-wide vehicle fleet registry
router.get("/all", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const vehicles = await Vehicle.find()
      .populate("userId", "name email role")
      .sort({ createdAt: -1 });
    return res.json(vehicles);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// POST /api/vehicles -> Register a vehicle to the current logged-in user
router.post("/", verifyToken, async (req, res) => {
  try {
    const { plateNumber, type, sizeClass } = req.body;
    const userId = req.user.id || req.user._id;

    if (!plateNumber || !type || !sizeClass) {
      return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
    }

    const cleanPlate = plateNumber.trim().toUpperCase();

    // Prevent registering duplicate license plate numbers
    const existing = await Vehicle.findOne({ plateNumber: cleanPlate, userId });
    if (existing) {
      return res.status(400).json({ error: "VEHICLE_ALREADY_REGISTERED" });
    }

    const newVehicle = await Vehicle.create({
      userId,
      plateNumber: cleanPlate,
      type: type.trim(),
      sizeClass
    });

    return res.status(201).json({
      message: "Vehicle added successfully",
      vehicle: newVehicle
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// DELETE /api/vehicles/:id -> Owner deletes their vehicle; Admin deletes any
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const filter =
      req.user.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, userId };

    const vehicle = await Vehicle.findOneAndDelete(filter);

    if (!vehicle) {
      return res.status(404).json({ error: "VEHICLE_NOT_FOUND_OR_UNAUTHORIZED" });
    }

    return res.json({ message: "Vehicle removed successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;