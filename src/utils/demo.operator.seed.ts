import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { demoOperators } from "./demo.operator.data.js";

const seedDemoOperators = async () => {
  console.log("🌱 Seeding demo operators...");

  for (const operator of demoOperators) {
    const passwordHash = await bcrypt.hash(operator.password, 12);

    const existingUser = await prisma.user.findUnique({
      where: {
        email: operator.email,
      },
    });

    if (existingUser) {
      console.log(
        `⚠️ ${operator.operatorType} already exists: ${operator.email}`,
      );
      continue;
    }

    const user = await prisma.user.create({
      data: {
        name: operator.name,
        email: operator.email,
        phone: operator.phone,
        passwordHash,
        role: "OPERATOR",
        emailVerified: true,
        status: "ACTIVE",
        needPasswordChange: false,

        operatorProfile: {
          create: {
            employeeCode: operator.employeeCode,
            operatorType: operator.operatorType,
            licenseNumber: operator.licenseNumber,
          },
        },
      },

      include: {
        operatorProfile: true,
      },
    });

    console.log(
      `✅ Created ${operator.operatorType}: ${user.email} (${operator.employeeCode})`,
    );
  }

  console.log("🎉 Demo operators seeding completed!");
};

export default seedDemoOperators;
