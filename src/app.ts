import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { ambulanceRouter } from "./modules/ambulance/ambulance.route.js";
import { authRouter } from "./modules/auth/auth.route.js";
import { hospitalRouter } from "./modules/hospital/hospital.route.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/hospital", hospitalRouter);
app.use("/api/ambulance", ambulanceRouter);

export default app;
