import { BloodGroup, Gender } from "../../generated/prisma/enums.js";

export interface ICreatePatient {
  name: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  medicalNotes?: string;
  emergencyContact?: string;
}

export interface IUpdatePatient {
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  medicalNotes?: string;
  emergencyContact?: string;
}
