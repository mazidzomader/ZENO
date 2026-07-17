const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Slot routes stub" });
});

module.exports = router;
