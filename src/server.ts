import http from "http";

import app from "./app.js";

import { prisma } from "./lib/prisma.js";

import { reddisClient } from "./lib/reddis.js";

import { initializeSocket } from "./socket/socket.js";
import { seedSuperAdmin } from "./utils/seed.js";

const port = 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

const main = async () => {
  try {
    await prisma.$connect();

    console.log("database connect successfully");

    await reddisClient.connect();

    console.log("reddis connect successfully!");

    await seedSuperAdmin();

    // await seedDemoOperators();

    server.listen(port, () => {
      console.log("server running on port", port);
    });
  } catch (error) {
    console.log(error);

    await prisma.$disconnect();

    process.exit(1);
  }
};

main();
