import { io } from "socket.io-client";

const ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwY2M5ZjM5NC0xZDk0LTQ1OGUtODZmMi1lMGY5OGFhNGZlNDQiLCJuYW1lIjoicmFqdSIsImVtYWlsIjoibGFwdG9wYWxpODQ3QGdtYWlsLmNvbSIsInJvbGUiOiJDVVNUT01FUiIsImlhdCI6MTc4OTYyMzM0OCwiZXhwIjoxNzg5NzA5NzQ4fQ.XWVa3PAG3xt8H9I-XBTZOzTHY7s8N6De_uHLW_OIpVw";

const socket = io("http://localhost:5000", {
  auth: {
    token: ACCESS_TOKEN,
  },
});

socket.on("connect", () => {
  console.log("Connected to Socket.IO server!");
  console.log("Socket ID:", socket.id);
});

socket.on("connect_error", (error) => {
  console.log("Socket connection error:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected from Socket.IO server");
  console.log("Reason:", reason);
});
