import type { Request, Response } from "express";

export const healthHandler = (_req: Request, res: Response) => {
	res.status(200).json({
		status: "ok",
		timestamp: new Date().toISOString(),
		version: "1.0.0",
	});
};
