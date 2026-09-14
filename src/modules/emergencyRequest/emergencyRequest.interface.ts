import { EmergencyType, Priority } from "../../generated/prisma/enums.js";

export interface ICreateEmergencyRequest {
  patientId: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  emergencyType: EmergencyType;
  priority: Priority;
  requiredTime: string;
  notes?: string;
}
