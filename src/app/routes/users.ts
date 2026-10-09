import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { validateRequest } from "../../app/middleware/validation";
import { TenantServiceWithUserRepo } from "../../modules/tenants/tenant.service";
import { UserService } from "../../modules/users/user.service";
import { requireTenantAccess } from "../../shared/auth/middleware";

export const userRouter = Router();

const userService = new UserService();
const tenantService = new TenantServiceWithUserRepo();

userRouter.get("/me", async (req: Request, res: Response) => {
	const user = requireTenantAccess(req);

	const userProfile = await userService.getById(user.userId);
	if (!userProfile) {
		return res.status(404).json({
			error: { code: "NOT_FOUND", message: "User not found" },
		});
	}

	res.json(userProfile);
});

userRouter.patch(
	"/me",
	validateRequest({
		body: z.object({
			firstName: z.string().min(1).max(255).optional(),
			lastName: z.string().min(1).max(255).optional(),
		}),
	}),
	async (req: Request, res: Response) => {
		const user = requireTenantAccess(req);
		const input = req.body; // Already validated and parsed

		const updatedUser = await userService.updateProfile(user.userId, {
			firstName: input.firstName,
			lastName: input.lastName,
		});

		res.json(updatedUser);
	},
);

userRouter.get("/me/tenant", async (req: Request, res: Response) => {
	const user = requireTenantAccess(req);

	const tenant = await tenantService.getUserTenant(user.userId);
	if (!tenant) {
		return res.status(404).json({
			error: { code: "NOT_FOUND", message: "User has no tenant" },
		});
	}

	res.json({
		id: tenant.id,
		name: tenant.name,
		createdAt: tenant.createdAt.toISOString(),
		updatedAt: tenant.updatedAt.toISOString(),
	});
});
