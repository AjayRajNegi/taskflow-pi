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

export const createTenantSchema = z.object({
  name: z.string().min(1, "name is required").max(255, "name must be 255 characters or less"),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
});

export const createSubscriptionSchema = z.object({
  planId: z.string().min(1, "planId is required"),
  paymentMethodId: z.string().uuid("Invalid payment method ID").optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export function validateRegister(input: unknown): RegisterInput {
  return registerSchema.parse(input);
}

export function validateLogin(input: unknown): LoginInput {
  return loginSchema.parse(input);
}

export function validateCreateTenant(input: unknown): CreateTenantInput {
  return createTenantSchema.parse(input);
}

export function validateUpdateUser(input: unknown): UpdateUserInput {
  return updateUserSchema.parse(input);
}

export function validateCreateSubscription(input: unknown): CreateSubscriptionInput {
  return createSubscriptionSchema.parse(input);
}