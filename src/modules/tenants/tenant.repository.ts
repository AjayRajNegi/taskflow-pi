import type { Tenant } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

export class TenantRepository {
	async findById(id: string): Promise<Tenant | null> {
		return prisma.tenant.findUnique({
			where: { id },
		});
	}

	async findByName(name: string): Promise<Tenant | null> {
		return prisma.tenant.findFirst({
			where: { name },
		});
	}

	async create(data: { name: string }): Promise<Tenant> {
		return prisma.tenant.create({
			data: { name: data.name },
		});
	}

	async update(id: string, data: { name?: string }): Promise<Tenant> {
		return prisma.tenant.update({
			where: { id },
			data,
		});
	}

	async delete(id: string): Promise<void> {
		await prisma.tenant.delete({
			where: { id },
		});
	}
}
