import { io } from "socket.io-client";

const ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMDc3NTUzMC0yOWQ1LTQ4YjktYWM4MC03ZWEyYTc0YzYxMzIiLCJuYW1lIjoiSW1yYW4gQWhtZWQiLCJlbWFpbCI6ImRlbW8uZHJpdmVyNUBnbWFpbC5jb20iLCJyb2xlIjoiT1BFUkFUT1IiLCJpYXQiOjE3ODk2MzI4OTAsImV4cCI6MTc4OTcxOTI5MH0.mpIDeU8BJzHvPihsmxwmRMnzFsv4GtOcrd3X5zB59zE";

const socket = io("http://localhost:5000", {
  auth: {
    token: ACCESS_TOKEN,
  },
});

// ==========================================
// CONNECT
// ==========================================

socket.on("connect", () => {
  console.log("✅ Driver connected to Socket.IO!");
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
  console.log("=================================");
  console.log("✅ DRIVER JOINED TRIP ROOM");
  console.log("Trip ID:", data.tripId);
  console.log("Room:", data.room);
  console.log("=================================");

  console.log("📍 Sending test GPS location...");

  socket.emit("location:update", {
    tripId: data.tripId,
    latitude: 25.7439,
    longitude: 89.2752,
  });
});

// ==========================================
// LOCATION BROADCAST
// ==========================================

socket.on("trip:location_updated", (data) => {
  console.log("📍 Location broadcast received:", data);
});

// ==========================================
// LOCATION UPDATE ERROR
// ==========================================

socket.on("location:update_error", (error) => {
  console.log("❌ Location update error:", error);
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
