const express = require("express");
const router = express.Router();

const {
  createSlot,
  bulkCreateSlots,
  getSlots,
  getMySlots,
  getSlotById,
  updateSlot,
  deactivateSlot,
  activateSlot,
  deleteSlot,
} = require("../controllers/slotController");

const { protect, authorize } = require("../middleware/authMiddleware");

// "/mine" must come before "/:id" so it isn't swallowed as an id param
router.get("/mine", protect, authorize("owner", "admin"), getMySlots);
router.get("/", getSlots);
router.post("/bulk", protect, authorize("owner", "admin"), bulkCreateSlots);
router.post("/", protect, authorize("owner", "admin"), createSlot);
router.get("/:id", getSlotById);
router.put("/:id", protect, authorize("owner", "admin"), updateSlot);
router.patch("/:id/deactivate", protect, authorize("owner", "admin"), deactivateSlot);
router.patch("/:id/activate", protect, authorize("owner", "admin"), activateSlot);
router.delete("/:id", protect, authorize("owner", "admin"), deleteSlot);

module.exports = router;