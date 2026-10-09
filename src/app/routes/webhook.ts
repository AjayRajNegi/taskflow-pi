import { type Request, type Response, Router } from "express";
import { PaymentService } from "../../modules/payments/payment.service";
import { SubscriptionService } from "../../modules/payments/subscription.service";
import { logger } from "../../shared/logging/logger";

export const webhookRouter = Router();

const paymentService = new PaymentService();
const subscriptionService = new SubscriptionService();

webhookRouter.post("/", async (req: Request, res: Response) => {
	const requestId = (req.headers["x-request-id"] as string) || "unknown";
	const signature = req.headers["x-razorpay-signature"] as string | undefined;

	// req.body is a Buffer when using express.raw()
	const rawBody = Buffer.isBuffer(req.body)
		? req.body
		: typeof req.body === "string"
			? Buffer.from(req.body)
			: null;

	logger.debug("Received Razorpay webhook", {
		requestId,
		signatureProvided: !!signature,
		bodyLength: rawBody ? rawBody.length : 0,
	});

	if (!rawBody) {
		logger.warn("Webhook missing or invalid body", { requestId });
		return res.status(400).json({
			error: { code: "INVALID_PAYLOAD", message: "Missing or invalid body" },
		});
	}

	const isValid = paymentService.verifyWebhookSignature(rawBody, signature);
	if (!isValid) {
		logger.warn("Invalid webhook signature", { requestId });
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
	} catch (e) {
		const err = e as Error;
		logger.warn("Invalid JSON payload in webhook", {
			requestId,
			error: err.message,
		});
		return res.status(400).json({
			error: { code: "INVALID_PAYLOAD", message: "Invalid JSON payload" },
		});
	}

	const event = eventPayload?.event;
	if (!event) {
		logger.warn("Missing event type in webhook payload", { requestId });
		return res.status(400).json({
			error: { code: "INVALID_PAYLOAD", message: "Missing event type" },
		});
	}

	logger.info("Processing Razorpay webhook event", {
		requestId,
		event,
		payloadId: eventPayload?.payload?.subscription?.entity?.id,
	});

	// Correct Razorpay structure:
	// { event, payload: { subscription: { entity: { id, current_end, ... } } } }
	const subscriptionEntity =
		eventPayload?.payload?.subscription?.entity ?? null;

	const subscriptionId = subscriptionEntity?.id;
	if (!subscriptionId) {
		// No subscription entity → nothing to update. Return 200 to stop retries.
		logger.warn("Webhook missing subscription entity", {
			requestId,
			event,
			payload: JSON.stringify(eventPayload).slice(0, 500),
		});
		return res.status(200).json({ status: "processed" });
	}

	const subscription =
		await subscriptionService.subscriptionRepository.findByRazorpaySubscriptionId(
			subscriptionId,
		);

	if (!subscription) {
		logger.warn(`No local subscription for Razorpay ID: ${subscriptionId}`, {
			requestId,
			subscriptionId,
		});
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
				logger.info("Subscription activated", {
					requestId,
					subscriptionId: subscription.id,
				});
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
				logger.info("Subscription cancelled", {
					requestId,
					subscriptionId: subscription.id,
				});
				break;
			}

			case "subscription.paused": {
				await subscriptionService.subscriptionRepository.update(
					subscription.id,
					{ status: "paused" },
				);
				logger.info("Subscription paused", {
					requestId,
					subscriptionId: subscription.id,
				});
				break;
			}

			case "subscription.pending":
			case "subscription.halted": {
				// Payment failures on subscriptions surface as these events
				await subscriptionService.subscriptionRepository.update(
					subscription.id,
					{ status: "past_due" },
				);
				logger.warn("Subscription past due (payment failure)", {
					requestId,
					subscriptionId: subscription.id,
				});
				// TODO: enqueue retry job (T-010)
				break;
			}

			// Optionally handle subscription.charged, subscription.completed, etc.
			default:
				logger.info("Unhandled webhook event", {
					requestId,
					event,
				});
				break;
		}
	} catch (e) {
		const err = e as Error;
		logger.error(`Error processing webhook event ${event}`, {
			requestId,
			error: err.message,
			stack: err.stack,
		});
		return res.status(500).json({
			error: { code: "INTERNAL_ERROR", message: "Internal server error" },
		});
	}

	return res.status(200).json({ status: "processed" });
});
