import "dotenv/config";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import { healthRouter, protectedRouter, publicRouter } from "./app/routes";
import { webhookRouter } from "./app/routes/webhook";
import { authMiddleware } from "./shared/auth/middleware";

const app = express();
const PORT = process.env.PORT ?? 8000;

console.log("REDIS_URL:", process.env.REDIS_URL);

// Capture raw body only for the webhook path
app.use(
	"/api/v1/payments/webhook",
	express.raw({ type: "application/json" }),
	webhookRouter,
);

// Parse JSON bodies (for API routes)
app.use(express.json());

// Health check (no auth required)
app.use("/api/v1", healthRouter);

// Public routes (no auth required)
app.use("/api/v1", publicRouter);

// Protected routes (auth required)
app.use("/api/v1", authMiddleware, protectedRouter);

// 404 handler
app.use((_req, res: Response) => {
	res.status(404).json({ error: { code: "NOT_FOUND", message: "Not Found" } });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	console.error("Error:", err);
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
		console.log(`Server running on port ${PORT}`);
	});
}
