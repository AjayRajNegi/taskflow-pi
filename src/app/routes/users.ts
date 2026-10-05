import { type Request, type Response, Router } from "express";
import { TenantServiceWithUserRepo } from "../../modules/tenants/tenant.service";
import { requireTenantAccess } from "../../shared/auth/middleware";

export const userRouter = Router();

const tenantService = new TenantServiceWithUserRepo();

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
