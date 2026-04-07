require("dotenv").config({ path: require("path").resolve(__dirname, "../../../../.env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

const processingRoutes = require("./routes/processing.routes");
const accessRoutes = require("./routes/access.routes");
const emailsRoutes = require("./routes/emails.routes");
const tokensRoutes = require("./routes/tokens.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const studentsRoutes = require("./routes/students.routes");

app.use("/api/v1/processing", processingRoutes);
app.use("/api/v1/access-records", accessRoutes);
app.use("/api/v1/emails", emailsRoutes);
app.use("/api/v1/tokens", tokensRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/students", studentsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;