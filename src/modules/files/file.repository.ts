import type { Attachment } from "../../../generated/prisma/client";
import { prisma } from "../../infrastructure/database/prisma";

export class FileRepository {
	async findById(id: string): Promise<Attachment | null> {
		return prisma.attachment.findUnique({
			where: { id },
			include: {
				task: {
					include: {
						tenant: true,
					},
				},
			},
		});
	}

	async findByIdAndTenant(
		id: string,
		tenantId: string,
	): Promise<Attachment | null> {
		return prisma.attachment.findFirst({
			where: {
				id,
				task: {
					tenantId,
				},
			},
			include: {
				task: {
					include: {
						tenant: true,
					},
				},
			},
		});
	}

	async create(data: {
		taskId: string;
		filename: string;
		mimeType?: string | null;
		sizeBytes: bigint;
		storageKey: string;
		tenantId: string;
	}): Promise<Attachment> {
		return prisma.attachment.create({
			data: {
				taskId: data.taskId,
				filename: data.filename,
				mimeType: data.mimeType,
				sizeBytes: data.sizeBytes,
				storageKey: data.storageKey,
				tenantId: data.tenantId,
			},
			include: {
				task: {
					include: {
						tenant: true,
					},
				},
			},
		});
	}

	async delete(id: string, tenantId: string): Promise<void> {
		await prisma.attachment.deleteMany({
			where: {
				id,
				task: {
					tenantId,
				},
			},
		});
	}
}
