const express = require("express");
const router = express.Router();

const {
  getMyBlackouts,
  deleteBlackout,
} = require("../controllers/blackoutController");

const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/mine", protect, authorize("owner", "admin"), getMyBlackouts);
router.delete("/:id", protect, authorize("owner", "admin"), deleteBlackout);

module.exports = router;