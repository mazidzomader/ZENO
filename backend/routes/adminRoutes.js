const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");

// All routes require authentication and admin role
router.use(protect);
router.use(authorize("admin"));

// Stats
router.get("/stats", adminController.getSystemStats);

// Users
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.post("/users", adminController.createUser);
router.put("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);
router.patch("/users/:id/suspend", adminController.toggleSuspension);

// Buildings
router.get("/buildings", adminController.getBuildings);

// Slots
router.get("/slots", adminController.getSlots);

// Bookings
router.get("/bookings", adminController.getBookings);
router.patch("/bookings/:id/cancel", adminController.cancelBooking);

module.exports = router;