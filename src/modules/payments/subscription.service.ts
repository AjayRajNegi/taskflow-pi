import type { Subscription } from "../../../generated/prisma/client";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { TenantRepository } from "../tenants/tenant.repository";
import { PaymentService } from "./payment.service";
import { SubscriptionRepository } from "./subscription.repository";

export interface SubscriptionOutput {
	id: string;
	status: string;
	planId: string | null;
	currentPeriodEnd: Date | null;
	createdAt: Date;
	updatedAt: Date;
	tenantId: string;
}

export class SubscriptionService {
	private subscriptionRepository: SubscriptionRepository;
	private paymentService: PaymentService;
	private tenantRepository: TenantRepository;

	constructor(
		subscriptionRepository?: SubscriptionRepository,
		paymentService?: PaymentService,
		tenantRepository?: TenantRepository,
	) {
		this.subscriptionRepository =
			subscriptionRepository || new SubscriptionRepository();
		this.paymentService = paymentService || new PaymentService();
		this.tenantRepository = tenantRepository || new TenantRepository();
	}

	async getSubscriptionByTenantId(
		tenantId: string,
	): Promise<SubscriptionOutput | null> {
		const subscription =
			await this.subscriptionRepository.findByTenantId(tenantId);
		if (!subscription) {
			return null;
		}
		return this.toSubscriptionOutput(subscription);
	}

	async createSubscription(
		tenantId: string,
		planId: string,
		paymentMethodId?: string | null,
	): Promise<SubscriptionOutput & { clientSecret?: string }> {
		const tenant = await this.tenantRepository.findById(tenantId);
		if (!tenant) {
			throw new NotFoundError("Tenant not found");
		}

		if (!planId || planId.trim().length === 0) {
			throw new ValidationError("planId is required");
		}

		const existingSubscription =
			await this.subscriptionRepository.findByTenantId(tenantId);
		if (existingSubscription) {
			// For now, we do not allow updating; we return a conflict.
			// In the future, we might allow updating or changing plan.
			throw new ValidationError("Subscription already exists for this tenant");
		}

		// TODO: Integrate with payment provider to create an order/subscription
		// For now, we'll create a subscription record with a pending status
		// and return a mock clientSecret for the client to complete payment.

		// In a real implementation, we would:
		// 1. Use the payment service to create an order with Razorpay
		// 2. Save the subscription record with the Razorpay order ID and initial status (e.g., 'created')
		// 3. Return the subscription info and the order details (including clientSecret if needed)

		// We'll mock the payment service call
		const paymentResponse = await this.paymentService.createOrder({
			amount: 1000, // Example amount: 1000 paise = 10 INR (or whatever currency)
			currency: "INR", // This should come from the plan configuration
			receipt: `receipt_${tenantId}_${Date.now()}`,
			notes: {
				planId,
				tenantId,
			},
		});

		// Create subscription record with initial status
		// We'll set the status to 'created' or 'pending' based on our business logic.
		// The webhook will update the status upon payment confirmation.
		const subscription = await this.subscriptionRepository.create({
			tenantId,
			status: "created", // initial status before payment confirmation
			planId: planId.trim(),
			// currentPeriodEnd will be set by the webhook when the subscription becomes active
			currentPeriodEnd: null,
		});

		// Return the subscription info along with any client-secret needed for payment confirmation
		// In a real Razorpay integration, the clientSecret would be returned by the order creation API.
		// We'll mock it here.
		return {
			...this.toSubscriptionOutput(subscription),
			clientSecret: `secret_${Math.random().toString(36).substr(2, 9)}`,
		};
	}

	private toSubscriptionOutput(subscription: Subscription): SubscriptionOutput {
		return {
			id: subscription.id,
			status: subscription.status,
			planId: subscription.planId,
			currentPeriodEnd: subscription.currentPeriodEnd,
			createdAt: subscription.createdAt,
			updatedAt: subscription.updatedAt,
			tenantId: subscription.tenantId,
		};
	}
}
