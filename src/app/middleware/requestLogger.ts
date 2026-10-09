import type { NextFunction, Request, Response } from "express";
import { logger } from "../../shared/logging/logger";
import { withRequestId } from "../../shared/logging/requestIdStorage";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
	const requestId =
		(req.headers["x-request-id"] as string) || crypto.randomUUID();
	// Attach requestId to request for downstream use
	(req as any).id = requestId;
	// Also set response header for client correlation
	res.setHeader("X-Request-ID", requestId);

	const startTime = Date.now();

	// Log incoming request
	logger.info("Incoming request", {
		requestId,
		method: req.method,
		path: req.path,
		query: req.query,
		ip: req.ip,
		userAgent: req.get("User-Agent"),
	});

	// Wrapper for res.end to capture response time and status
	const originalSend = res.send;
	res.send = (body: any) => {
		res.send = originalSend; // restore original send
		const responseTime = Date.now() - startTime;
		logger.info("Outgoing response", {
			requestId,
			statusCode: res.statusCode,
			responseTime: `${responseTime}ms`,
		});
		return res.send(body);
	};

	// Run the next middleware within the request ID context
	return withRequestId(requestId, () => next());
}
