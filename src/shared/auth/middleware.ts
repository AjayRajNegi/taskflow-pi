import type { NextFunction, Request, Response } from "express";
import { setTenantId, setUserId } from "../../shared/logging/requestIdStorage";
import { AuthenticationError } from "../errors";
import { extractTokenFromHeader, type TokenPayload, verifyToken } from "./jwt";

export interface AuthenticatedRequest extends Request {
	user?: TokenPayload;
}

export async function authMiddleware(
	req: AuthenticatedRequest,
	_res: Response,
	next: NextFunction,
): Promise<void> {
	const token = extractTokenFromHeader(req.headers.authorization);

	if (!token) {
		throw new AuthenticationError("Missing or invalid Authorization header");
	}

	try {
		const payload = await verifyToken(token);
		req.user = payload;
		// Store userId and tenantId in the async local storage for logging
		setUserId(payload.userId);
		setTenantId(payload.tenantId);
		next();
	} catch {
		throw new AuthenticationError("Invalid or expired token");
	}
}

export function requireTenantAccess(req: AuthenticatedRequest): TokenPayload {
	if (!req.user) {
		throw new AuthenticationError("User not authenticated");
	}
	return req.user;
}
