import bcrypt from "bcrypt";
import config from "../config/index.js";
import { UserRole } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";

export const seedSuperAdmin = async () => {
  try {
    const isSuperAdminExist = await prisma.user.findFirst({
      where: {
        role: UserRole.ADMIN,
      },
    });

    if (isSuperAdminExist) {
      console.log("Super Admin Already Exists!");
      return;
    }

    const name = config.admin_name;
    const email = config.admin_email;
    const phone = config.admin_phone;
    const password = config.admin_password;

    if (!name || !email || !password) {
      throw new Error(
        "Super Admin Name , Email, Password Missing In Env File!!!",
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );

    const superAdmin = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        needPasswordChange: false,
        emailVerified: true,
      },
    });

    console.log(" Admin Created : ", superAdmin);
  } catch (error) {
    console.log("Error Seeding Super Admin : ", error);

    await prisma.user.delete({
      where: {
        email: config.admin_email,
      },
    });
  }
};
