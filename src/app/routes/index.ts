import { Router } from "express";
import { authRouter } from "./auth";
import { filesRouter } from "./files";
import { healthHandler } from "./health";
import { taskRouter } from "./tasks";
import { tenantRouter } from "./tenants";
import { userRouter } from "./users";

export const healthRouter = Router();
export const publicRouter = Router();
export const protectedRouter = Router();

healthRouter.get("/health", healthHandler);
publicRouter.use("/auth", authRouter);
protectedRouter.use("/tenants", tenantRouter);
protectedRouter.use("/users", userRouter);
protectedRouter.use("/tasks", taskRouter);
protectedRouter.use("/files", filesRouter);
