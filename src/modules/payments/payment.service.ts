import crypto from "node:crypto";

// This is a stub for the Razorpay payment service.
// In a real implementation, this would interact with the Razorpay API.
export class PaymentService {
	private readonly webhookSecret: string;

	constructor() {
		this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
		if (!this.webhookSecret) {
			console.warn(
				"RAZORPAY_WEBHOOK_SECRET is not set. Webhook signature verification will fail.",
			);
		}
	}

	async createOrder(options: {
		amount: number; // amount in the smallest currency unit (e.g., paise for INR)
		currency: string;
		receipt: string;
		notes?: Record<string, string>;
	}): Promise<{
		id: string; // Razorpay order ID
		amount: number;
		currency: string;
		// In a real implementation, this would also include other fields like `created_at`, etc.
	}> {
		// TODO: Implement actual Razorpay API call
		// For now, return a mock response
		return {
			id: `order_${Math.random().toString(36).substr(2, 9)}`,
			amount: options.amount,
			currency: options.currency,
		};
	}

	/**
	 * Verify Razorpay webhook signature.
	 * @param rawBody - Exact raw request body (string or Buffer). NEVER re-stringify parsed JSON.
	 * @param signature - Value of `x-razorpay-signature` header
	 */
	verifyWebhookSignature(
		rawBody: string | Buffer,
		signature: string | undefined,
	): boolean {
		if (!signature || !this.webhookSecret) {
			return false;
		}

		const expectedSignature = crypto
			.createHmac("sha256", this.webhookSecret)
			.update(rawBody)
			.digest("hex");

		const expectedBuf = Buffer.from(expectedSignature, "utf8");
		const receivedBuf = Buffer.from(signature, "utf8");

		// timingSafeEqual throws if lengths differ
		if (expectedBuf.length !== receivedBuf.length) {
			return false;
		}

		return crypto.timingSafeEqual(expectedBuf, receivedBuf);
	}
}
