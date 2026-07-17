const express = require("express");
const router = express.Router();

const { createBuilding, getMyBuildings } = require("../controllers/buildingController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/mine", protect, authorize("owner", "admin"), getMyBuildings);
router.post("/", protect, authorize("owner", "admin"), createBuilding);

module.exports = router;