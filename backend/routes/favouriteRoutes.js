const express = require("express");
const router = express.Router();

const {
  addFavourite,
  removeFavourite,
  getMyFavourites,
} = require("../controllers/favouriteController");

const { protect } = require("../middleware/authMiddleware");


// Add favourite
router.post("/", protect, addFavourite);


// Remove favourite
router.delete("/:slotId", protect, removeFavourite);


// Get user's favourites
router.get("/", protect, getMyFavourites);


module.exports = router;