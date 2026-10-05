import { type Request, type Response, Router } from "express";
import { UserService } from "../../modules/users/user.service";
import { signToken } from "../../shared/auth/jwt";
import {
	type LoginInput,
	validateLogin,
	validateRegister,
} from "../../shared/validation";

export const authRouter = Router();

const userService = new UserService();

authRouter.post("/register", async (req: Request, res: Response) => {
	const input = validateRegister(req.body);
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
});

authRouter.post("/login", async (req: Request, res: Response) => {
	const input = validateLogin(req.body) as LoginInput;

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
});
