import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../../shared/logging/logger";
import type { Storage } from "./types";

const STORAGE_ROOT = process.env.STORAGE_ROOT || "./storage";

export class LocalStorage implements Storage {
	async upload(options: {
		file: Express.Multer.File;
		tenantId: string;
		taskId: string;
	}): Promise<{ key: string }> {
		const { file, tenantId, taskId } = options;

		logger.debug("Uploading file to local storage", {
			tenantId,
			taskId,
			originalName: file.originalname,
			mimetype: file.mimetype,
			size: file.size,
		});

		const dir = join(
			STORAGE_ROOT,
			"tenants",
			tenantId,
			"tasks",
			taskId,
			"attachments",
		);
		await mkdir(dir, { recursive: true });

		const key = randomUUID();
		await writeFile(join(dir, key), file.buffer);

		logger.debug("File uploaded successfully", {
			tenantId,
			taskId,
			key,
			size: file.size,
		});

		return { key };
	}

	async delete(options: {
		key: string;
		tenantId: string;
		taskId: string;
	}): Promise<void> {
		const { key, tenantId, taskId } = options;
		const dir = join(
			STORAGE_ROOT,
			"tenants",
			tenantId,
			"tasks",
			taskId,
			"attachments",
		);
		const filePath = join(dir, key);
		try {
			await unlink(filePath);
			logger.debug("File deleted successfully", {
				tenantId,
				taskId,
				key,
			});
		} catch (e) {
			const err = e as Error;
			logger.warn(`File not found during deletion: ${filePath}`, {
				tenantId,
				taskId,
				key,
				error: err.message,
			});
		}
	}
}
