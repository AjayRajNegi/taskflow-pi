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

export function extractTokenFromHeader(
	authHeader: string | undefined,
): string | null {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return null;
	}
	return authHeader.slice(7);
}
