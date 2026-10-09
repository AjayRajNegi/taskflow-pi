import { type Request, type Response, Router } from "express";
import multer from "multer";
import { z } from "zod";
import { validateRequest } from "../../app/middleware/validation";
import { FileService } from "../../modules/files/file.service";
import type { AuthenticatedRequest } from "../../shared/auth/middleware";
import { NotFoundError, ValidationError } from "../../shared/errors";

export const filesRouter = Router();

const fileService = new FileService();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
});

function handleError(err: unknown, res: Response, context: string) {
	if (err instanceof ValidationError) {
		return res.status(400).json({
			error: { code: "VALIDATION_ERROR", message: err.message },
		});
	}
	if (err instanceof NotFoundError) {
		return res.status(404).json({
			error: { code: "NOT_FOUND", message: err.message },
		});
	}
	console.error(`Error ${context}:`, err);
	return res.status(500).json({
		error: { code: "INTERNAL_ERROR", message: "Internal server error" },
	});
}

filesRouter.post(
	"/:taskId/attachments",
	upload.single("file"),
	async (req: Request<{ taskId: string }>, res: Response) => {
		if (!req.file) {
			return res.status(400).json({
				error: { code: "VALIDATION_ERROR", message: "No file provided" },
			});
		}

		try {
			const { userId, tenantId } = (req as unknown as AuthenticatedRequest)
				.user!;

			const attachment = await fileService.uploadFile(
				req.params.taskId,
				userId,
				tenantId,
				req.file,
			);

			res.status(201).json({
				id: attachment.id,
				filename: attachment.filename,
				mimeType: attachment.mimeType,
				sizeBytes: attachment.sizeBytes,
				storageKey: attachment.storageKey,
				uploadedAt: attachment.uploadedAt.toISOString(),
				taskId: attachment.taskId,
			});
		} catch (err) {
			handleError(err, res, "uploading file");
		}
	},
);

filesRouter.get(
	"/:attachmentId",
	validateRequest({
		params: z.object({
			attachmentId: z.string().uuid("Invalid attachment ID format"),
		}),
	}),
	async (req: Request, res: Response) => {
		try {
			const attachment = await fileService.getFileMetadata(
				req.params.attachmentId as string,
				(req as unknown as AuthenticatedRequest).user!.tenantId,
			);

			if (!attachment) {
				return res.status(404).json({
					error: {
						code: "NOT_FOUND",
						message: "Attachment not found or not accessible",
					},
				});
			}

			res.json({
				id: attachment.id,
				filename: attachment.filename,
				mimeType: attachment.mimeType,
				sizeBytes: attachment.sizeBytes,
				storageKey: attachment.storageKey,
				uploadedAt: attachment.uploadedAt.toISOString(),
				taskId: attachment.taskId,
			});
		} catch (err) {
			handleError(err, res, "getting attachment metadata");
		}
	},
);

filesRouter.delete(
	"/:attachmentId",
	validateRequest({
		params: z.object({
			attachmentId: z.string().uuid("Invalid attachment ID format"),
		}),
	}),
	async (req: Request, res: Response) => {
		try {
			await fileService.deleteFile(
				req.params.attachmentId as string,
				(req as unknown as AuthenticatedRequest).user!.tenantId,
			);
			res.status(204).send();
		} catch (err) {
			handleError(err, res, "deleting attachment");
		}
	},
);
