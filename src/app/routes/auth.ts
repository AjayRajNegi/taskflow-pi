import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { validateRequest } from "../../app/middleware/validation";
import { UserService } from "../../modules/users/user.service";
import { signToken } from "../../shared/auth/jwt";
import type { LoginInput, RegisterInput } from "../../shared/validation";

export const authRouter = Router();

const userService = new UserService();

authRouter.post(
	"/register",
	validateRequest({
		body: z.object({
			email: z.string().email("Invalid email format"),
			password: z.string().min(8, "Password must be at least 8 characters"),
			firstName: z.string().min(1).max(255).optional(),
			lastName: z.string().min(1).max(255).optional(),
			tenantId: z.string().uuid("Invalid tenant ID format"),
		}),
	}),
	async (req: Request, res: Response) => {
		const input = req.body as RegisterInput;
		const user = await userService.register(input);

		const accessToken = await signToken({
			userId: user.id,
			email: user.email,
			tenantId: user.tenantId,
		});

		res.status(201).json({
			accessToken,
			expiresIn: 3600,
			user: {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				tenantId: user.tenantId,
				createdAt: user.createdAt.toISOString(),
			},
		});
	},
);

authRouter.post(
	"/login",
	validateRequest({
		body: z.object({
			email: z.string().email("Invalid email format"),
			password: z.string().min(1, "Password is required"),
		}),
	}),
	async (req: Request, res: Response) => {
		const input = req.body as LoginInput;

		const user = await userService.authenticate(input.email, input.password);
		const accessToken = await signToken({
			userId: user.id,
			email: user.email,
			tenantId: user.tenantId,
		});

		res.json({
			accessToken,
			expiresIn: 3600,
			user: {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				tenantId: user.tenantId,
			},
		});
	},
);
