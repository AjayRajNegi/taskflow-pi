import { Router } from "express";
import { healthHandler } from "./health";

export const healthRouter = Router();

healthRouter.get("/health", healthHandler);
