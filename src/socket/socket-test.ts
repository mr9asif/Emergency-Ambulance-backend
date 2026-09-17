import { io } from "socket.io-client";

const ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwY2M5ZjM5NC0xZDk0LTQ1OGUtODZmMi1lMGY5OGFhNGZlNDQiLCJuYW1lIjoicmFqdSIsImVtYWlsIjoibGFwdG9wYWxpODQ3QGdtYWlsLmNvbSIsInJvbGUiOiJDVVNUT01FUiIsImlhdCI6MTc4OTYzMjQ5OCwiZXhwIjoxNzg5NzE4ODk4fQ.4KKrf3nWgJoS2mp7Sj3WrBUa8AajqMen2vOiF_iDkzw";

const socket = io("http://localhost:5000", {
  auth: {
    token: ACCESS_TOKEN,
  },
});

// ==========================================
// CONNECT
// ==========================================

socket.on("connect", () => {
  console.log("✅ Connected to Socket.IO server!");

  console.log("Socket ID:", socket.id);

  console.log("Waiting for trip to start...");
});

// ==========================================
// TRIP TRACKING STARTED
// ==========================================

socket.on("trip:tracking_started", (data) => {
  console.log("🚑 Trip tracking started:", data);

  console.log("Joining trip room...");

  socket.emit("trip:join", data.tripId);
});

// ==========================================
// TRIP JOINED
// ==========================================

socket.on("trip:joined", (data) => {
  console.log("✅ Successfully joined trip room:", data);
});

socket.on("trip:location_updated", (data) => {
  console.log("🚑 DRIVER LOCATION UPDATED:", data);
});

// ==========================================
// TRIP JOIN ERROR
// ==========================================

socket.on("trip:join_error", (error) => {
  console.log("❌ Trip join error:", error);
});

// ==========================================
// CONNECTION ERROR
// ==========================================

socket.on("connect_error", (error) => {
  console.log("❌ Socket connection error:", error.message);
});

// ==========================================
// DISCONNECT
// ==========================================

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});
