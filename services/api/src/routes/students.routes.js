const express = require("express");
const router = express.Router();

router.get("/search", (req, res) => {
  res.status(200).json({ message: "Student search endpoint stub" });
});

router.get("/:studentId/weekly-history", (req, res) => {
  res.status(200).json({ message: "Student weekly history endpoint stub" });
});

module.exports = router;