import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { authRouter } from "./modules/auth/auth.route.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);

export default app;
