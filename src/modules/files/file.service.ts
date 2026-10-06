import type { Task, User } from "../../../generated/prisma/client";
import { getStorage } from "../../infrastructure/storage";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { TaskRepository } from "../tasks/task.repository";
import { FileRepository } from "./file.repository";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface AttachmentMetadata {
	id: string;
	filename: string;
	mimeType: string | null;
	sizeBytes: number;
	storageKey: string;
	uploadedAt: Date;
	taskId: string;
}

export class FileService {
	private fileRepository: FileRepository;
	private taskRepository: TaskRepository;
	private storage: ReturnType<typeof getStorage>;

	constructor(
		fileRepository?: FileRepository,
		taskRepository?: TaskRepository,
	) {
		this.fileRepository = fileRepository || new FileRepository();
		this.taskRepository = taskRepository || new TaskRepository();
		this.storage = getStorage();
	}

	private validateFileSize(size: number): void {
		if (size > MAX_FILE_SIZE) {
			throw new ValidationError(
				`File size exceeds ${MAX_FILE_SIZE} bytes limit`,
			);
		}
	}

	async uploadFile(
		taskId: string,
		userId: string,
		tenantId: string,
		file: Express.Multer.File,
	): Promise<AttachmentMetadata> {
		const task = await this.taskRepository.findByIdAndTenant(taskId, tenantId);
		if (!task) {
			throw new NotFoundError("Task not found or not accessible");
		}

		this.validateFileSize(file.size);

		const storageResult = await this.storage.upload({
			file,
			tenantId: task.tenantId,
			taskId: task.id,
		});

		const attachment = await this.fileRepository.create({
			taskId: task.id,
			filename: file.originalname,
			mimeType: file.mimetype ?? null,
			sizeBytes: BigInt(file.size),
			storageKey: storageResult.key,
			tenantId: task.tenantId,
		});

		return {
			id: attachment.id,
			filename: attachment.filename,
			mimeType: attachment.mimeType,
			sizeBytes: Number(attachment.sizeBytes),
			storageKey: attachment.storageKey,
			uploadedAt: attachment.uploadedAt,
			taskId: attachment.taskId,
		};
	}

	async getFileMetadata(
		attachmentId: string,
		tenantId: string,
	): Promise<AttachmentMetadata | null> {
		const attachment = await this.fileRepository.findByIdAndTenant(
			attachmentId,
			tenantId,
		);
		if (!attachment) {
			return null;
		}

		return {
			id: attachment.id,
			filename: attachment.filename,
			mimeType: attachment.mimeType,
			sizeBytes: Number(attachment.sizeBytes),
			storageKey: attachment.storageKey,
			uploadedAt: attachment.uploadedAt,
			taskId: attachment.taskId,
		};
	}

	async deleteFile(attachmentId: string, tenantId: string): Promise<void> {
		const attachment = await this.fileRepository.findByIdAndTenant(
			attachmentId,
			tenantId,
		);
		if (!attachment) {
			throw new NotFoundError("Attachment not found or not accessible");
		}

		await this.storage.delete({
			key: attachment.storageKey,
			tenantId: attachment.tenantId,
			taskId: attachment.taskId,
		});

		await this.fileRepository.delete(attachmentId, attachment.tenantId);
	}
}
