const express = require("express");
const router = express.Router();

router.post("/absence/run", (req, res) => {
  res.status(200).json({ message: "Absence email run endpoint stub" });
});

router.get("/logs", (req, res) => {
  res.status(200).json({ message: "Email logs endpoint stub" });
});

router.post("/:emailLogId/resend", (req, res) => {
  res.status(200).json({ message: "Email resend endpoint stub" });
});

module.exports = router;