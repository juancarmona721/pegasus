const express = require("express");
const router = express.Router();

router.get("/last", (req, res) => {
  res.status(200).json({ message: "Processing last endpoint stub" });
});

router.post("/seeder/run", (req, res) => {
  res.status(200).json({ message: "Seeder run endpoint stub" });
});

module.exports = router;