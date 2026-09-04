const express = require("express");
const router = express.Router();

const {
  createBuilding,
  getMyBuildings,
  getBuildingById,
  updateBuilding,
  deleteBuilding,
} = require("../controllers/buildingController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/mine", protect, authorize("owner", "admin"), getMyBuildings);
router.post("/", protect, authorize("owner", "admin"), createBuilding);
router.get("/:id", protect, authorize("owner", "admin"), getBuildingById);
router.put("/:id", protect, authorize("owner", "admin"), updateBuilding);
router.delete("/:id", protect, authorize("owner", "admin"), deleteBuilding);

module.exports = router;