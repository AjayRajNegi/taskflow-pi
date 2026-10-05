import type { User } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

export class UserRepository {
	async findByEmail(email: string): Promise<User | null> {
		return prisma.user.findUnique({
			where: { email },
		});
	}

	async findById(id: string): Promise<User | null> {
		return prisma.user.findUnique({
			where: { id },
		});
	}

	async findByTenantId(tenantId: string): Promise<User[]> {
		return prisma.user.findMany({
			where: { tenantId },
		});
	}

	async create(data: {
		email: string;
		passwordHash: string;
		firstName?: string;
		lastName?: string;
		tenantId: string;
	}): Promise<User> {
		return prisma.user.create({
			data: {
				email: data.email,
				passwordHash: data.passwordHash,
				firstName: data.firstName,
				lastName: data.lastName,
				tenantId: data.tenantId,
			},
		});
	}

	async update(
		id: string,
		data: Partial<Pick<User, "firstName" | "lastName" | "isActive">>,
	): Promise<User> {
		return prisma.user.update({
			where: { id },
			data,
		});
	}

	async existsByEmail(email: string): Promise<boolean> {
		const user = await prisma.user.findUnique({
			where: { email },
			select: { id: true },
		});
		return user !== null;
	}
}
