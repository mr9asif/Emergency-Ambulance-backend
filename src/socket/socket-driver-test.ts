import { io } from "socket.io-client";

const ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMDc3NTUzMC0yOWQ1LTQ4YjktYWM4MC03ZWEyYTc0YzYxMzIiLCJuYW1lIjoiSW1yYW4gQWhtZWQiLCJlbWFpbCI6ImRlbW8uZHJpdmVyNUBnbWFpbC5jb20iLCJyb2xlIjoiT1BFUkFUT1IiLCJpYXQiOjE3ODk2MzI4MDgsImV4cCI6MTc4OTcxOTIwOH0.QCT5_fg9abtgBVQ7i6N6bUuOw4VH3EOwi9DyvcwR6Rs";

const TRIP_ID = "YOUR_IN_PROGRESS_TRIP_ID";

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
