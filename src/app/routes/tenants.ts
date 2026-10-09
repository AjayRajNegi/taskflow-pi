import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { validateRequest } from "../../app/middleware/validation";
import { TenantServiceWithUserRepo } from "../../modules/tenants/tenant.service";

export const tenantRouter = Router();

const tenantService = new TenantServiceWithUserRepo();

// POST /tenants - Create a new tenant (protected)
tenantRouter.post(
	"/",
	validateRequest({
		body: z.object({
			name: z
				.string()
				.min(1, "name is required")
				.max(255, "name must be 255 characters or less"),
		}),
	}),
	async (req: Request, res: Response) => {
		// const user = requireTenantAccess(req);
		const input = req.body; // Already validated and parsed

		const tenant = await tenantService.createTenant(input.name);
		res.status(201).json({
			id: tenant.id,
			name: tenant.name,
			createdAt: tenant.createdAt.toISOString(),
			updatedAt: tenant.updatedAt.toISOString(),
		});
	},
);
