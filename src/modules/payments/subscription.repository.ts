import type { Subscription, Tenant } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

export class SubscriptionRepository {
	async findById(id: string): Promise<Subscription | null> {
		return prisma.subscription.findUnique({
			where: { id },
			include: {
				tenant: true,
			},
		});
	}

	async findByTenantId(tenantId: string): Promise<Subscription | null> {
		return prisma.subscription.findFirst({
			where: { tenantId },
			include: {
				tenant: true,
			},
		});
	}

	async create(data: {
		tenantId: string;
		status: string;
		planId?: string | null;
		currentPeriodEnd?: Date | null;
	}): Promise<Subscription> {
		return prisma.subscription.create({
			data: {
				tenantId: data.tenantId,
				status: data.status,
				planId: data.planId,
				currentPeriodEnd: data.currentPeriodEnd,
			},
			include: {
				tenant: true,
			},
		});
	}

	async update(
		id: string,
		data: {
			status?: string;
			planId?: string | null;
			currentPeriodEnd?: Date | null;
		},
	): Promise<Subscription> {
		return prisma.subscription.update({
			where: { id },
			data: {
				status: data.status,
				planId: data.planId,
				currentPeriodEnd: data.currentPeriodEnd,
			},
			include: {
				tenant: true,
			},
		});
	}

	async delete(id: string): Promise<void> {
		await prisma.subscription.delete({
			where: { id },
		});
	}
}
