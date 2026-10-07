import { type Request, type Response, Router } from "express";
import { SubscriptionService } from "../../modules/payments/subscription.service";
import { requireTenantAccess } from "../../shared/auth/middleware";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { validateCreateSubscription } from "../../shared/validation";

export const paymentsRouter = Router();

const subscriptionService = new SubscriptionService();

paymentsRouter.get("/", async (req: Request, res: Response) => {
	const user = requireTenantAccess(req);

	const subscription = await subscriptionService.getSubscriptionByTenantId(
		user.tenantId,
	);

	if (!subscription) {
		return res.status(404).json({
			error: {
				code: "NOT_FOUND",
				message: "No subscription found for this tenant",
			},
		});
	}

	res.json({
		id: subscription.id,
		status: subscription.status,
		planId: subscription.planId,
		currentPeriodEnd: subscription.currentPeriodEnd
			? subscription.currentPeriodEnd.toISOString()
			: null,
		createdAt: subscription.createdAt.toISOString(),
		updatedAt: subscription.updatedAt.toISOString(),
		tenantId: subscription.tenantId,
	});
});

paymentsRouter.post("/", async (req: Request, res: Response) => {
	const user = requireTenantAccess(req);
	const input = validateCreateSubscription(req.body);

	try {
		const result = await subscriptionService.createSubscription(
			user.tenantId,
			input.planId,
			input.paymentMethodId,
		);

		res.status(201).json({
			id: result.id,
			status: result.status,
			planId: result.planId,
			currentPeriodEnd: result.currentPeriodEnd
				? result.currentPeriodEnd.toISOString()
				: null,
			createdAt: result.createdAt.toISOString(),
			updatedAt: result.updatedAt.toISOString(),
			tenantId: result.tenantId,
			// Include clientSecret if present (for payment confirmation)
			...(result.clientSecret ? { clientSecret: result.clientSecret } : {}),
		});
	} catch (err) {
		if (err instanceof ValidationError) {
			return res.status(400).json({
				error: { code: "VALIDATION_ERROR", message: err.message },
			});
		}
		if (err instanceof NotFoundError) {
			return res.status(404).json({
				error: { code: "NOT_FOUND", message: err.message },
			});
		}
		console.error("Error creating subscription:", err);
		return res.status(500).json({
			error: { code: "INTERNAL_ERROR", message: "Internal server error" },
		});
	}
});
