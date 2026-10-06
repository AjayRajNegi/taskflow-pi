import type { Task } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

export class TaskRepository {
	async findById(id: string): Promise<Task | null> {
		return prisma.task.findUnique({
			where: { id },
			include: {
				assignee: true,
			},
		});
	}

	async findByIdAndTenant(id: string, tenantId: string): Promise<Task | null> {
		return prisma.task.findFirst({
			where: {
				id,
				tenantId,
			},
			include: {
				assignee: true,
			},
		});
	}

	async create(data: {
		title: string;
		description?: string | null;
		status?: string;
		assigneeId?: string | null;
		tenantId: string;
	}): Promise<Task> {
		return prisma.task.create({
			data: {
				title: data.title,
				description: data.description,
				status: data.status ?? "todo",
				assigneeId: data.assigneeId,
				tenantId: data.tenantId,
			},
			include: {
				assignee: true,
			},
		});
	}

	async update(
		id: string,
		tenantId: string,
		data: {
			title?: string;
			description?: string | null;
			status?: string;
			assigneeId?: string | null;
		},
	): Promise<Task> {
		return prisma.task.update({
			where: {
				id,
				tenantId, // This ensures tenant isolation
			},
			data: {
				title: data.title,
				description: data.description,
				status: data.status,
				assigneeId: data.assigneeId,
			},
			include: {
				assignee: true,
			},
		});
	}

	async delete(id: string, tenantId: string): Promise<void> {
		await prisma.task.delete({
			where: {
				id,
				tenantId, // This ensures tenant isolation
			},
		});
	}

	async findMany(
		tenantId: string,
		skip: number,
		take: number,
		filters: {
			status?: string;
			assigneeId?: string | null;
		},
	): Promise<{ tasks: Task[]; total: number }> {
		const where: any = {
			tenantId,
		};

		if (filters.status) {
			where.status = filters.status;
		}

		if (filters.assigneeId !== undefined && filters.assigneeId !== null) {
			where.assigneeId = filters.assigneeId;
		}

		const [tasks, total] = await prisma.$transaction([
			prisma.task.findMany({
				where,
				skip,
				take,
				orderBy: {
					createdAt: "desc",
				},
				include: {
					assignee: true,
				},
			}),
			prisma.task.count({
				where,
			}),
		]);

		return { tasks, total };
	}
}
