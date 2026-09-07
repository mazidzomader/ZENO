const mongoose = require("mongoose");
const Favourite = require("../models/Favourite");
const Slot = require("../models/Slot");

// @desc    Bookmark a slot (add to "My Saved Slots")
// @route   POST /api/favourites
// @access  Private
const addFavourite = async (req, res) => {
  try {
    const { slotId } = req.body;

    if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
      return res.status(400).json({ message: "Please provide a valid slotId." });
    }

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found." });
    }

    // Don't error out if it's already saved — just hand back the existing one.
    let favourite = await Favourite.findOne({
      user: req.user._id,
      slot: slotId,
    });

    if (!favourite) {
      favourite = await Favourite.create({
        user: req.user._id,
        slot: slotId,
      });
    }

    res.status(201).json({
      message: "Slot added to your saved slots.",
      favourite,
    });
  } catch (error) {
    // Duplicate key race (unique index) — treat as success either way.
    if (error.code === 11000) {
      return res.status(200).json({ message: "Slot already saved." });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove a bookmarked slot
// @route   DELETE /api/favourites/:slotId
// @access  Private
const removeFavourite = async (req, res) => {
  try {
    const { slotId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      return res.status(400).json({ message: "Invalid slotId." });
    }

    const deleted = await Favourite.findOneAndDelete({
      user: req.user._id,
      slot: slotId,
    });

    if (!deleted) {
      return res
        .status(404)
        .json({ message: "This slot isn't in your saved slots." });
    }

    res.status(200).json({ message: "Slot removed from your saved slots." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get the logged-in user's saved/bookmarked slots
// @route   GET /api/favourites
// @access  Private
const getMyFavourites = async (req, res) => {
  try {
    // Ascending order — the slot saved earliest (bookmarked first) shows first.
    const favourites = await Favourite.find({ user: req.user._id })
      .populate({
        path: "slot",
        populate: { path: "building", select: "name address" },
      })
      .sort({ createdAt: 1 });

    // A saved slot may have since been deleted by its owner — drop those
    // rather than showing broken cards.
    const valid = favourites.filter((fav) => fav.slot);

    res.status(200).json({ count: valid.length, favourites: valid });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addFavourite,
  removeFavourite,
  getMyFavourites,
};