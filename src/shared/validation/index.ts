import { z } from "zod";

export const registerSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	firstName: z.string().min(1).max(255).optional(),
	lastName: z.string().min(1).max(255).optional(),
	tenantId: z.string().uuid("Invalid tenant ID format"),
});

export const loginSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export function validateRegister(input: unknown): RegisterInput {
	return registerSchema.parse(input);
}

export function validateLogin(input: unknown): LoginInput {
	return loginSchema.parse(input);
}
