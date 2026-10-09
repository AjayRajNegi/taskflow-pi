import "dotenv/config";
import { type JWTPayload, jwtVerify, SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
	process.env.JWT_SECRET || "dev-secret-change-in-production",
);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

export interface TokenPayload {
	userId: string;
	email: string;
	tenantId: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
	return new SignJWT({ ...payload } as JWTPayload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(JWT_EXPIRES_IN)
		.sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
	const { payload } = await jwtVerify(token, JWT_SECRET);
	return {
		userId: payload.userId as string,
		email: payload.email as string,
		tenantId: payload.tenantId as string,
	};
}

/**
 * Decode the JWT payload without verification.
 * Returns the payload object if the token is a valid JWT (base64url encoded parts),
 * otherwise returns undefined.
 * This is intended for logging only; do not trust the payload for security decisions.
 */
export function decodeTokenPayload(token: string): TokenPayload | undefined {
	try {
		// JWT format: header.payload.signature
		const parts = token.split(".");
		if (parts.length !== 3) return undefined;
		const payloadBase64 = parts[1];
		if (!payloadBase64) return undefined;
		// Replace URL-safe characters
		let padded = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
		// Add padding if needed
		while (padded.length % 4) {
			padded += "=";
		}
		const decoded = Buffer.from(padded, "base64").toString("utf8");
		return JSON.parse(decoded) as TokenPayload;
	} catch {
		return undefined;
	}
}

export function extractTokenFromHeader(
	authHeader: string | undefined,
): string | null {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return null;
	}
	return authHeader.slice(7);
}
