import { type Request, type Response, Router } from "express";
import { TenantServiceWithUserRepo } from "../../modules/tenants/tenant.service";
import { UserService } from "../../modules/users/user.service";
import { requireTenantAccess } from "../../shared/auth/middleware";
import { validateUpdateUser } from "../../shared/validation";

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

userRouter.patch("/me", async (req: Request, res: Response) => {
	const user = requireTenantAccess(req);
	const input = validateUpdateUser(req.body);

	const updatedUser = await userService.updateProfile(user.userId, {
		firstName: input.firstName,
		lastName: input.lastName,
	});

	res.json(updatedUser);
});

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
