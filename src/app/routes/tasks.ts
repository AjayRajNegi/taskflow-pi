import { type Request, type Response, Router } from "express";
import { TaskService } from "../../modules/tasks/task.service";
import type { AuthenticatedRequest } from "../../shared/auth/middleware";
import {
	createTaskSchema,
	taskIdSchema,
	taskQuerySchema,
	updateTaskSchema,
} from "../../shared/validation/tasks.validation";

export const taskRouter = Router();

const taskService = new TaskService();

taskRouter.get("/", async (req: Request, res: Response) => {
	const queryParams = taskQuerySchema.parse(req.query);

	if (queryParams.page < 1) {
		return res.status(400).json({
			error: { code: "VALIDATION_ERROR", message: "page must be >= 1" },
		});
	}

	if (queryParams.limit < 1 || queryParams.limit > 100) {
		return res.status(400).json({
			error: {
				code: "VALIDATION_ERROR",
				message: "limit must be between 1 and 100",
			},
		});
	}

	const result = await taskService.getTasks(
		{
			status: queryParams.status,
			assigneeId: queryParams.assigneeId,
		},
		{
			page: queryParams.page,
			limit: queryParams.limit,
		},
		(req as AuthenticatedRequest).user!.userId,
	);

	res.json(result);
});

taskRouter.post("/", async (req: Request, res: Response) => {
	const input = createTaskSchema.parse(req.body);

	const task = await taskService.createTask(
		input,
		(req as AuthenticatedRequest).user!.userId,
	);

	res.status(201).json({
		id: task.id,
		title: task.title,
		description: task.description,
		status: task.status,
		assigneeId: task.assigneeId,
		assignee: task.assignee,
		createdAt: task.createdAt.toISOString(),
		updatedAt: task.updatedAt.toISOString(),
	});
});

taskRouter.get("/:taskId", async (req: Request, res: Response) => {
	// Validate taskId
	const taskId = taskIdSchema.parse(req.params.taskId);

	// Get task
	const task = await taskService.getTask(
		taskId,
		(req as AuthenticatedRequest).user!.userId,
	);

	if (!task) {
		return res.status(404).json({
			error: { code: "NOT_FOUND", message: "Task not found or not accessible" },
		});
	}

	res.json({
		id: task.id,
		title: task.title,
		description: task.description,
		status: task.status,
		assigneeId: task.assigneeId,
		assignee: task.assignee,
		createdAt: task.createdAt.toISOString(),
		updatedAt: task.updatedAt.toISOString(),
	});
});

taskRouter.patch("/:taskId", async (req: Request, res: Response) => {
	const taskId = taskIdSchema.parse(req.params.taskId);
	const input = updateTaskSchema.parse(req.body);

	const task = await taskService.updateTask(
		taskId,
		input,
		(req as AuthenticatedRequest).user!.userId,
	);

	res.json({
		id: task.id,
		title: task.title,
		description: task.description,
		status: task.status,
		assigneeId: task.assigneeId,
		assignee: task.assignee,
		createdAt: task.createdAt.toISOString(),
		updatedAt: task.updatedAt.toISOString(),
	});
});

taskRouter.delete("/:taskId", async (req: Request, res: Response) => {
	// Validate taskId
	const taskId = taskIdSchema.parse(req.params.taskId);

	// Delete task
	await taskService.deleteTask(
		taskId,
		(req as AuthenticatedRequest).user!.userId,
	);

	res.status(204).send();
});
