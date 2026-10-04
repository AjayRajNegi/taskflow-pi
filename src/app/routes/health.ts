import type { Request, Response } from "express";
import { Router } from "express";

const router = Router();

export const healthHandler = async (req: Request, res: Response) => {
	return res.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		version: "1.0.0",
	});
};

router.get("/", healthHandler);

export default router;
