export interface Storage {
	upload(options: {
		file: Express.Multer.File;
		tenantId: string;
		taskId: string;
	}): Promise<{ key: string }>;

	delete(options: {
		key: string;
		tenantId: string;
		taskId: string;
	}): Promise<void>;
}
