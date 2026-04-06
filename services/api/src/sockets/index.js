module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });

    socket.on("processing.updated", (data) => {
      console.log("processing.updated:", data);
      io.emit("processing.updated", data);
    });

    socket.on("attendance.updated", (data) => {
      console.log("attendance.updated:", data);
      io.emit("attendance.updated", data);
    });

    socket.on("token.updated", (data) => {
      console.log("token.updated:", data);
      io.emit("token.updated", data);
    });

    socket.on("email.status.updated", (data) => {
      console.log("email.status.updated:", data);
      io.emit("email.status.updated", data);
    });
  });
};