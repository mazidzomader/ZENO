const mongoose = require("mongoose");

const pricingRuleSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // If null, the rule applies across all buildings owned by this owner.
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    // "all" matches every slot type.
    slotType: {
      type: String,
      enum: ["all", "standard", "compact", "large", "handicap", "ev"],
      default: "all",
    },

    // Floor range this rule applies to. Leave both null to match every floor.
    floorFrom: {
      type: Number,
      default: null,
    },
    floorTo: {
      type: Number,
      default: null,
    },

    // Days of week this rule is active on (0 = Sunday ... 6 = Saturday).
    // Empty array = applies every day.
    daysOfWeek: {
      type: [Number],
      default: [],
    },

    // Time-of-day window in 24h "HH:MM" format. Leave both null for all-day.
    timeStart: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
        message: "timeStart must be in HH:MM 24-hour format.",
      },
    },
    timeEnd: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
        message: "timeEnd must be in HH:MM 24-hour format.",
      },
    },

    // Demand-based trigger: rule only applies once occupancy reaches this %.
    // Leave null to ignore demand and always apply (subject to other filters).
    demandThreshold: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    adjustmentType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    // Positive = surcharge, negative = discount.
    // For "percentage", value is a percent (e.g. 15 = +15%, -10 = -10%).
    // For "fixed", value is added directly to the price in currency units.
    adjustmentValue: {
      type: Number,
      required: true,
    },

    // When multiple rules match, they are applied in ascending priority
    // order (lowest first). Higher priority rules are applied last and
    // therefore have the final say on the price.
    priority: {
      type: Number,
      default: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

pricingRuleSchema.index({ owner: 1, active: 1 });
pricingRuleSchema.index({ building: 1, active: 1 });

module.exports = mongoose.model("PricingRule", pricingRuleSchema);