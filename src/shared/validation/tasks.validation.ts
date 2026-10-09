import z from "zod";

export const taskIdSchema = z.string().uuid("Invalid task ID format");

export const createTaskSchema = z.object({
	title: z
		.string()
		.min(1, "title is required")
		.max(255, "title must be 255 characters or less"),
	description: z.string().optional().nullable(),
	status: z.enum(["todo", "in_progress", "done"]).optional(),
	assigneeId: z.string().uuid("Invalid assignee ID").optional().nullable(),
});

export const updateTaskSchema = z.object({
	title: z
		.string()
		.min(1, "title is required")
		.max(255, "title must be 255 characters or less")
		.optional(),
	description: z.string().optional().nullable(),
	status: z.enum(["todo", "in_progress", "done"]).optional(),
	assigneeId: z.string().uuid("Invalid assignee ID").optional().nullable(),
});

export const taskQuerySchema = z.object({
	page: z
		.string()
		.regex(/^\d+$/)
		.transform(Number)
		.pipe(z.number().min(1, "page must be >= 1"))
		.default(() => 1),
	limit: z
		.string()
		.regex(/^\d+$/)
		.transform(Number)
		.pipe(z.number().min(1, "limit must be >= 1"))
		.pipe(z.number().max(100, "limit must be <= 100"))
		.default(() => 10),
	status: z.enum(["todo", "in_progress", "done"]).optional(),
	assigneeId: z.string().uuid("Invalid assignee ID").optional().nullable(),
});
