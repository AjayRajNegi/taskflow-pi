import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Storage } from "./types";

const STORAGE_ROOT = process.env.STORAGE_ROOT || "./storage";

export class LocalStorage implements Storage {
	async upload(options: {
		file: Express.Multer.File;
		tenantId: string;
		taskId: string;
	}): Promise<{ key: string }> {
		const { file, tenantId, taskId } = options;

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
		} catch (err) {
			console.warn(`File not found during deletion: ${filePath}`);
		}
	}
}
