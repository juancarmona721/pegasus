require("dotenv").config({ path: require("path").resolve(__dirname, "../../../../.env") });
const http = require("http");
const socketIo = require("socket.io");

const app = require("./app");
const setupSocket = require("./sockets");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

setupSocket(io);

server.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});