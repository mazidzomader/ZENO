const express = require("express");
const router = express.Router();

const {
  createPricingRule,
  getMyPricingRules,
  getPricingRuleById,
  updatePricingRule,
  togglePricingRule,
  deletePricingRule,
  calculateSlotPrice,
} = require("../controllers/pricingRuleController");

const { protect, authorize } = require("../middleware/authMiddleware");

// Public — anyone (e.g. a renter browsing slots) can preview the live price
router.get("/calculate/:slotId", calculateSlotPrice);

// Private — owner's own rules (must come before "/:id" so "mine" isn't treated as an id)
router.get("/mine", protect, authorize("owner", "admin"), getMyPricingRules);

// Private — only owners and admins can manage pricing rules
router.post("/", protect, authorize("owner", "admin"), createPricingRule);
router.get("/:id", protect, authorize("owner", "admin"), getPricingRuleById);
router.put("/:id", protect, authorize("owner", "admin"), updatePricingRule);
router.patch(
  "/:id/toggle",
  protect,
  authorize("owner", "admin"),
  togglePricingRule
);
router.delete("/:id", protect, authorize("owner", "admin"), deletePricingRule);

module.exports = router;