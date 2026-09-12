// src/modules/ambulance/ambulance.interface.ts

import {
  AmbulanceStatus,
  AmbulanceType,
  Prisma,
} from "../../generated/prisma/client.js";

export interface ICreateAmbulance {
  registrationNumber: string;
  ambulanceType: AmbulanceType;
  baseHospitalId?: string;
  currentLatitude?: Prisma.Decimal | number | string;
  currentLongitude?: Prisma.Decimal | number | string;
}

export interface IUpdateAmbulance {
  registrationNumber?: string;
  ambulanceType?: AmbulanceType;
  status?: AmbulanceStatus;
  baseHospitalId?: string | null;
  currentLatitude?: Prisma.Decimal | number | string | null;
  currentLongitude?: Prisma.Decimal | number | string | null;
}
