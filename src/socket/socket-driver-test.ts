import { io } from "socket.io-client";

const ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMDc3NTUzMC0yOWQ1LTQ4YjktYWM4MC03ZWEyYTc0YzYxMzIiLCJuYW1lIjoiSW1yYW4gQWhtZWQiLCJlbWFpbCI6ImRlbW8uZHJpdmVyNUBnbWFpbC5jb20iLCJyb2xlIjoiT1BFUkFUT1IiLCJpYXQiOjE3ODk3ODkwNjQsImV4cCI6MTc4OTg3NTQ2NH0.iYbQobCZgcYxz0mw4RaKV1pm4osH2yqwT_HkFXRpWws";

const socket = io("https://emergency-ambulance-backend.onrender.com", {
  auth: {
    token: ACCESS_TOKEN,
  },
});

// ==========================================
// TEST GPS LOCATIONS
// ==========================================

const locations = [
  {
    latitude: 25.7439,
    longitude: 89.2752,
  },
  {
    latitude: 25.7445,
    longitude: 89.276,
  },
  {
    latitude: 25.7452,
    longitude: 89.2771,
  },
  {
    latitude: 25.746,
    longitude: 89.2783,
  },
  {
    latitude: 25.7468,
    longitude: 89.2795,
  },
  {
    latitude: 25.7476,
    longitude: 89.2807,
  },
];

let currentTripId: string | null = null;
let locationIndex = 0;
let locationInterval: NodeJS.Timeout | null = null;

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

  currentTripId = data.tripId;

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

  currentTripId = data.tripId;

  console.log("🚑 Starting GPS simulation...");

  // Send first location immediately
  sendNextLocation();

  // Send another location every 3 seconds
  locationInterval = setInterval(() => {
    sendNextLocation();
  }, 3000);
});

// ==========================================
// SEND GPS LOCATION
// ==========================================

const sendNextLocation = () => {
  if (!currentTripId) {
    console.log("❌ No active trip.");
    return;
  }

  if (locationIndex >= locations.length) {
    console.log("🏁 GPS simulation completed.");

    if (locationInterval) {
      clearInterval(locationInterval);
      locationInterval = null;
    }

    return;
  }

  const location = locations[locationIndex];

  console.log(
    `📍 Sending GPS ${locationIndex + 1}/${locations.length}:`,
    location,
  );

  socket.emit("location:update", {
    tripId: currentTripId,
    latitude: location.latitude,
    longitude: location.longitude,
  });

  locationIndex++;
};

// ==========================================
// LOCATION BROADCAST
// ==========================================

socket.on("trip:location_updated", (data) => {
  console.log("📍 Location broadcast received:", data);
});

// ==========================================
// TRACKING STOPPED
// ==========================================

socket.on("trip:tracking_stopped", (data) => {
  console.log("🛑 Trip tracking stopped:", data);

  if (locationInterval) {
    clearInterval(locationInterval);
    locationInterval = null;
  }

  console.log("🛑 GPS simulation stopped.");
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

  if (locationInterval) {
    clearInterval(locationInterval);
    locationInterval = null;
  }
});
