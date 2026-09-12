import app from "./app.js";
import { prisma } from "./lib/prisma.js";
import { reddisClient } from "./lib/reddis.js";
import { seedSuperAdmin } from "./utils/seed.js";

const port = 5000;

const main = async () => {
  try {
    await prisma.$connect();
    console.log("database connect successfully");
    await reddisClient.connect();
    console.log("reddis connect successfully!");
    await seedSuperAdmin();

    app.listen(port, () => {
      console.log("server running on port", port);
    });
  } catch (error) {
    console.log(error);
    prisma.$disconnect();
    process.exit(1);
  }
};

main();
