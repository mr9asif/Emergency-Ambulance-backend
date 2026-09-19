import { Prisma } from "../../generated/prisma/client.js";

export interface ICreateHospital {
  name: string;
  phone?: string;
  address: string;
  latitude: Prisma.Decimal | number | string;
  longitude: Prisma.Decimal | number | string;
  hasEmergency?: boolean;
}

export interface IUpdateHospital {
  name?: string;
  phone?: string;
  address?: string;
  latitude?: Prisma.Decimal | number | string;
  longitude?: Prisma.Decimal | number | string;
  hasEmergency?: boolean;
  isActive?: boolean;
}
