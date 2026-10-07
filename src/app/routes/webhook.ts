import { type Request, type Response, Router } from "express";
import { PaymentService } from "../../modules/payments/payment.service";
import { SubscriptionService } from "../../modules/payments/subscription.service";

export const webhookRouter = Router();

const paymentService = new PaymentService();
const subscriptionService = new SubscriptionService();

webhookRouter.post("/", async (req: Request, res: Response) => {
	const signature = req.headers["x-razorpay-signature"] as string | undefined;

	// req.body is a Buffer when using express.raw()
	const rawBody = Buffer.isBuffer(req.body)
		? req.body
		: typeof req.body === "string"
			? Buffer.from(req.body)
			: null;

	if (!rawBody) {
		return res.status(400).json({
			error: { code: "INVALID_PAYLOAD", message: "Missing or invalid body" },
		});
	}

	const isValid = paymentService.verifyWebhookSignature(rawBody, signature);
	if (!isValid) {
		return res.status(401).json({
			error: {
				code: "INVALID_SIGNATURE",
				message: "Invalid webhook signature",
			},
		});
	}

	let eventPayload: any;
	try {
		eventPayload = JSON.parse(rawBody.toString("utf8"));
	} catch {
		return res.status(400).json({
			error: { code: "INVALID_PAYLOAD", message: "Invalid JSON payload" },
		});
	}

	const event = eventPayload?.event;
	if (!event) {
		return res.status(400).json({
			error: { code: "INVALID_PAYLOAD", message: "Missing event type" },
		});
	}

	// Correct Razorpay structure:
	// { event, payload: { subscription: { entity: { id, current_end, ... } } } }
	const subscriptionEntity =
		eventPayload?.payload?.subscription?.entity ?? null;

	const subscriptionId = subscriptionEntity?.id;
	if (!subscriptionId) {
		// No subscription entity → nothing to update. Return 200 to stop retries.
		console.warn(
			`Webhook missing subscription entity: event=${event}`,
			JSON.stringify(eventPayload).slice(0, 500),
		);
		return res.status(200).json({ status: "processed" });
	}

	const subscription =
		await subscriptionService.subscriptionRepository.findByRazorpaySubscriptionId(
			subscriptionId,
		);

	if (!subscription) {
		console.warn(`No local subscription for Razorpay ID: ${subscriptionId}`);
		return res.status(200).json({ status: "processed" });
	}

	try {
		switch (event) {
			case "subscription.activated": {
				const currentPeriodEnd = subscriptionEntity.current_end
					? new Date(subscriptionEntity.current_end * 1000)
					: null;

				await subscriptionService.subscriptionRepository.update(
					subscription.id,
					{
						status: "active",
						currentPeriodEnd,
					},
				);
				break;
			}

			case "subscription.cancelled": {
				// British spelling used by Razorpay
				await subscriptionService.subscriptionRepository.update(
					subscription.id,
					{
						status: "canceled", // keep your internal spelling if preferred
						currentPeriodEnd: null,
					},
				);
				break;
			}

			case "subscription.paused": {
				await subscriptionService.subscriptionRepository.update(
					subscription.id,
					{ status: "paused" },
				);
				break;
			}

			case "subscription.pending":
			case "subscription.halted": {
				// Payment failures on subscriptions surface as these events
				await subscriptionService.subscriptionRepository.update(
					subscription.id,
					{ status: "past_due" },
				);
				// TODO: enqueue retry job (T-010)
				break;
			}

			// Optionally handle subscription.charged, subscription.completed, etc.
			default:
				console.info(`Unhandled webhook event: ${event}`);
				break;
		}
	} catch (err) {
		console.error(`Error processing webhook event ${event}:`, err);
		return res.status(500).json({
			error: { code: "INTERNAL_ERROR", message: "Internal server error" },
		});
	}

	return res.status(200).json({ status: "processed" });
});
