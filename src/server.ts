import app from "./app.js";
import { prisma } from "./lib/prisma.js";

const port = 5000;

const main = async () => {
  try {
    await prisma.$connect();
    console.log("database connect successfully");

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
