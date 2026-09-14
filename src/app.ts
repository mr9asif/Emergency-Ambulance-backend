import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { adminRouter } from "./modules/admin/admin.route.js";
import { ambulanceRouter } from "./modules/ambulance/ambulance.route.js";
import { authRouter } from "./modules/auth/auth.route.js";
import { emergencyRequestRouter } from "./modules/emergencyRequest/emergencyRequest.route.js";
import { hospitalRouter } from "./modules/hospital/hospital.route.js";
import { operatorRouter } from "./modules/operator/operator.route.js";
import { operatorApplicationRouter } from "./modules/operatorApplication/operatorApplication.route.js";
import { patientRouter } from "./modules/patient/patient.route.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/hospital", hospitalRouter);
app.use("/api/ambulance", ambulanceRouter);
app.use("/api/operator", operatorRouter);
app.use("/api/operatorApplication", operatorApplicationRouter);
app.use("/api/admin", adminRouter);
app.use("/api/patient", patientRouter);
app.use("/api/emergencyRequest", emergencyRequestRouter);

export default app;
