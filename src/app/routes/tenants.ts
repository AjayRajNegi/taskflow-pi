import { type Request, type Response, Router } from "express";
import { TenantServiceWithUserRepo } from "../../modules/tenants/tenant.service";
import { validateCreateTenant } from "../../shared/validation";
import { requireTenantAccess, type AuthenticatedRequest } from "../../shared/auth/middleware";

export const tenantRouter = Router();

const tenantService = new TenantServiceWithUserRepo();

// POST /tenants - Create a new tenant (protected)
tenantRouter.post("/", async (req: Request, res: Response) => {
	const user = requireTenantAccess(req);
	const input = validateCreateTenant(req.body);

	const tenant = await tenantService.createTenant(input.name);
	res.status(201).json({
		id: tenant.id,
		name: tenant.name,
		createdAt: tenant.createdAt.toISOString(),
		updatedAt: tenant.updatedAt.toISOString(),
	});
});