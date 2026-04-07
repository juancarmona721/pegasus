const express = require("express");
const router = express.Router();

router.get("/summary", (req, res) => {
  res.status(200).json({ message: "Dashboard summary endpoint stub" });
});

router.get("/morning-leak", (req, res) => {
  res.status(200).json({ message: "Morning leak endpoint stub" });
});

router.get("/weekly-patterns", (req, res) => {
  res.status(200).json({ message: "Weekly patterns endpoint stub" });
});

module.exports = router;