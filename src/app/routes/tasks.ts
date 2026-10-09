import { type Request, type Response, Router } from "express";
import type { z } from "zod";
import { authorizeResource } from "../../app/middleware/authorization";
import { validateRequest } from "../../app/middleware/validation";
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

taskRouter.get(
	"/",
	validateRequest({ query: taskQuerySchema }),
	async (req: Request, res: Response) => {
		const queryParams = req.query as unknown as z.infer<typeof taskQuerySchema>;

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
	},
);

taskRouter.post(
	"/",
	validateRequest({ body: createTaskSchema }),
	async (req: Request, res: Response) => {
		const input = req.body as unknown as z.infer<typeof createTaskSchema>;

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
	},
);

taskRouter.get(
	"/:taskId",
	validateRequest({ params: taskIdSchema }),
	authorizeResource(
		taskIdSchema,
		async (id: string) => {
			// Load the task by ID only (without tenant check) so we can check tenant in middleware
			return taskService.findById(id);
		},
		(resource: any) => resource.tenantId,
	),
	async (req: Request, res: Response) => {
		// The task is now attached to the request by the authorization middleware
		const task = (req as any).resource;

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
	},
);

taskRouter.patch(
	"/:taskId",
	validateRequest({ params: taskIdSchema, body: updateTaskSchema }),
	authorizeResource(
		taskIdSchema,
		async (id: string) => {
			return taskService.findById(id);
		},
		(resource: any) => resource.tenantId,
	),
	async (req: Request, res: Response) => {
		const task = (req as any).resource;
		const input = req.body as unknown as z.infer<typeof updateTaskSchema>;

		const updatedTask = await taskService.updateTask(
			task.id,
			input,
			(req as AuthenticatedRequest).user!.userId,
		);

		res.json({
			id: updatedTask.id,
			title: updatedTask.title,
			description: updatedTask.description,
			status: updatedTask.status,
			assigneeId: updatedTask.assigneeId,
			assignee: updatedTask.assignee,
			createdAt: updatedTask.createdAt.toISOString(),
			updatedAt: updatedTask.updatedAt.toISOString(),
		});
	},
);

taskRouter.delete(
	"/:taskId",
	validateRequest({ params: taskIdSchema }),
	authorizeResource(
		taskIdSchema,
		async (id: string) => {
			return taskService.findById(id);
		},
		(resource: any) => resource.tenantId,
	),
	async (req: Request, res: Response) => {
		const task = (req as any).resource;

		await taskService.deleteTask(
			task.id,
			(req as AuthenticatedRequest).user!.userId,
		);

		res.status(204).send();
	},
);
