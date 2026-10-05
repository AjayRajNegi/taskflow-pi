import { Router } from "express";
import { authRouter } from "./auth";
import { healthHandler } from "./health";

export const healthRouter = Router();
export const publicRouter = Router();
export const protectedRouter = Router();

healthRouter.get("/health", healthHandler);
publicRouter.use("/auth", authRouter);
