import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../../shared/auth/middleware";
import { NotFoundError } from "../../shared/errors";

/**
 * Middleware to authorize access to a resource based on tenantId.
 * @param paramsSchema Zod schema for validating and extracting the resource ID from request parameters.
 * @param loadResource Function that loads the resource by its ID. Should return the resource or null if not found.
 * @param getTenantIdFromResource Function that extracts the tenantId from the resource.
 * @returns Express middleware function.
 */
export function authorizeResource(
	paramsSchema: any,
	loadResource: (id: string) => Promise<any>,
	getTenantIdFromResource: (resource: any) => string,
) {
	return async (
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction,
	) => {
		// Validate and extract the resource ID from request parameters
		let params: any;
		try {
			params = paramsSchema.parse(req.params);
		} catch (err) {
			// If validation fails, throw a ValidationError (will be caught by error handler)
			throw err; // Assuming err is a ZodError, which will be handled by the error handler
		}

		const resourceId = params.id; // Assuming the parameter name is 'id'. We can make it configurable, but for simplicity we assume 'id'.

		// Load the resource
		const resource = await loadResource(resourceId);

		if (!resource) {
			// Resource not found or not accessible (due to tenant mismatch in the load function?).
			// We throw NotFoundError to avoid leaking existence.
			throw new NotFoundError("Resource not found");
		}

		// Check tenantId
		const resourceTenantId = getTenantIdFromResource(resource);
		const userTenantId = req.user?.tenantId;

		if (!userTenantId || resourceTenantId !== userTenantId) {
			// Mismatch: either user has no tenant (should not happen if authenticated) or tenantId mismatch.
			// We throw NotFoundError to avoid leaking existence.
			throw new NotFoundError("Resource not found");
		}

		// Attach the resource to the request for use in the route handler
		(req as any).resource = resource;

		next();
	};
}
