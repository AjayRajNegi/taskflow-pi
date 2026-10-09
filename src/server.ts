import "dotenv/config";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import { requestLogger } from "./app/middleware/requestLogger";
import { healthRouter, protectedRouter, publicRouter } from "./app/routes";
import { webhookRouter } from "./app/routes/webhook";
import { decodeTokenPayload, extractTokenFromHeader } from "./shared/auth/jwt";
import { authMiddleware } from "./shared/auth/middleware";
import { logger } from "./shared/logging/logger";

const app = express();
const PORT = process.env.PORT ?? 8000;

logger.info("Starting server", { port: PORT, nodeEnv: process.env.NODE_ENV });

// Capture raw body only for the webhook path
app.use(
	"/api/v1/payments/webhook",
	express.raw({ type: "application/json" }),
	webhookRouter,
);

// Parse JSON bodies (for API routes)
app.use(express.json());

// Request logging middleware
app.use(requestLogger);

// Health check (no auth required)
app.use("/api/v1", healthRouter);

// Public routes (no auth required)
app.use("/api/v1", publicRouter);

// Protected routes (auth required)
app.use("/api/v1", authMiddleware, protectedRouter);

// 404 handler
app.use((_req, res: Response) => {
	const requestId = (_req as any).id ?? "unknown";
	logger.warn("Route not found", {
		requestId,
		path: (_req as any).path,
		method: (_req as any).method,
	});
	res.status(404).json({ error: { code: "NOT_FOUND", message: "Not Found" } });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	const requestId = (_req as any).id ?? "unknown";
	// Determine log level and extra info based on error type
	if (err.name === "ValidationError") {
		logger.info("Validation error", {
			requestId,
			error: err.message,
			// Optionally add details if available
			// details: (err as any).details,
		});
	} else if (
		err.name === "AuthenticationError" ||
		err.name === "AuthorizationError"
	) {
		// Extract email from token if available
		let email: string | undefined;
		const authHeader = _req.headers.authorization;
		if (authHeader) {
			const token = extractTokenFromHeader(authHeader);
			if (token) {
				const payload = decodeTokenPayload(token);
				email = payload?.email;
			}
		}
		// Also try to get userId from request if set by authMiddleware (successful case)
		if ((_req as any).user) {
			email = ((_req as any).user as { email?: string }).email;
		}
		logger.warn(`${err.name}`, {
			requestId,
			error: err.message,
			email,
		});
	} else {
		// Unexpected errors
		logger.error("Unhandled error", {
			requestId,
			error: err.message,
			stack: err.stack,
			name: err.name,
		});
	}

	if (err.name === "ZodError") {
		return res.status(400).json({
			error: {
				code: "VALIDATION_ERROR",
				message: err.message,
			},
		});
	}
	if (
		err.name === "AuthenticationError" ||
		err.name === "AuthorizationError" ||
		err.name === "NotFoundError" ||
		err.name === "ConflictError" ||
		err.name === "ValidationError"
	) {
		const statusCode =
			err.name === "AuthenticationError"
				? 401
				: err.name === "AuthorizationError"
					? 403
					: err.name === "NotFoundError"
						? 404
						: err.name === "ConflictError"
							? 409
							: 400;
		return res.status(statusCode).json({
			error: {
				code: (err as any).code,
				message: err.message,
			},
		});
	}
	res.status(500).json({
		error: {
			code: "INTERNAL_ERROR",
			message: "Internal server error",
		},
	});
});

export default app;

if (process.env.NODE_ENV !== "test") {
	app.listen(PORT, () => {
		logger.info(`Server running on port ${PORT}`);
	});
}
