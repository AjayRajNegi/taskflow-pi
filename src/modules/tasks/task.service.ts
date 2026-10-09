import type { Task, User } from "../../../generated/prisma/client";
import { QueueService } from "../../infrastructure/queue";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { NotificationService } from "../notifications";
import { UserRepository } from "../users/user.repository";
import { TaskRepository } from "./task.repository";

export interface TaskOutput {
	id: string;
	title: string;
	description: string | null;
	status: string;
	assigneeId: string | null;
	assignee: {
		id: string;
		email: string;
		firstName: string | null;
		lastName: string | null;
	} | null;
	createdAt: Date;
	updatedAt: Date;
}

const ALLOWED_STATUSES = ["todo", "in_progress", "done"];

export class TaskService {
	private taskRepository: TaskRepository;
	private userRepository: UserRepository;
	private queueService: QueueService;
	private notificationService: NotificationService;

	constructor(
		taskRepository?: TaskRepository,
		userRepository?: UserRepository,
		queueService?: QueueService,
		notificationService?: NotificationService,
	) {
		this.taskRepository = taskRepository || new TaskRepository();
		this.userRepository = userRepository || new UserRepository();
		this.queueService = queueService || new QueueService();
		this.notificationService = notificationService || new NotificationService();
	}

	private validateStatus(status: string): void {
		if (!ALLOWED_STATUSES.includes(status)) {
			throw new ValidationError(
				`Status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
			);
		}
	}

	private validateTitle(title: string): void {
		if (!title || title.trim().length === 0) {
			throw new ValidationError("title is required");
		}
		if (title.length > 255) {
			throw new ValidationError("title must be 255 characters or less");
		}
	}

	private async validateAssigneeInSameTenant(
		assigneeId: string | null | undefined,
		tenantId: string,
	): Promise<void> {
		if (assigneeId === null || assigneeId === undefined) {
			return;
		}

		const user = await this.userRepository.findById(assigneeId);
		if (!user) {
			throw new ValidationError("Assignee not found");
		}

		if (user.tenantId !== tenantId) {
			throw new ValidationError("Assignee must be in the same tenant");
		}
	}

	async createTask(
		data: {
			title: string;
			description?: string | null;
			status?: string;
			assigneeId?: string | null;
		},
		userId: string,
	): Promise<TaskOutput> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError("User not found");
		}

		const tenantId = user.tenantId;

		this.validateTitle(data.title);
		if (data.status !== undefined) {
			this.validateStatus(data.status);
		}
		await this.validateAssigneeInSameTenant(data.assigneeId, tenantId);

		const task = await this.taskRepository.create({
			title: data.title.trim(),
			description: data.description ?? null,
			status: data.status ?? "todo",
			assigneeId: data.assigneeId ?? null,
			tenantId,
		});

		// Publish task.assigned notification if assigneeId is set
		if (data.assigneeId) {
			await this.queueService.addNotificationJob({
				taskId: task.id,
				assigneeUserId: data.assigneeId,
				taskTitle: data.title.trim(),
			});
		}

		return this.toTaskOutput(task as Task & { assignee: User | null });
	}

	async getTask(taskId: string, userId: string): Promise<TaskOutput | null> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError("User not found");
		}

		const task = await this.taskRepository.findByIdAndTenant(
			taskId,
			user.tenantId,
		);
		if (!task) {
			return null;
		}

		return this.toTaskOutput(task as Task & { assignee: User | null });
	}

	async updateTask(
		taskId: string,
		data: {
			title?: string;
			description?: string | null;
			status?: string;
			assigneeId?: string | null;
		},
		userId: string,
	): Promise<TaskOutput> {
		// Get user to get their tenantId
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError("User not found");
		}

		const tenantId = user.tenantId;

		// Check if task exists and belongs to user's tenant
		const existingTask = await this.taskRepository.findByIdAndTenant(
			taskId,
			tenantId,
		);
		if (!existingTask) {
			throw new NotFoundError("Task not found or not accessible");
		}

		// Validate input
		if (data.title !== undefined) {
			this.validateTitle(data.title);
		}
		if (data.status !== undefined) {
			this.validateStatus(data.status);
		}
		await this.validateAssigneeInSameTenant(data.assigneeId, tenantId);

		// Update task
		const task = await this.taskRepository.update(taskId, tenantId, {
			title: data.title ?? existingTask.title,
			description: data.description ?? existingTask.description,
			status: data.status ?? existingTask.status,
			assigneeId: data.assigneeId ?? existingTask.assigneeId,
		});

		// Publish task.assigned notification if assigneeId is set and changed from the original value
		if (
			data.assigneeId !== undefined &&
			data.assigneeId !== null &&
			data.assigneeId !== existingTask.assigneeId
		) {
			await this.queueService.addNotificationJob({
				taskId: task.id,
				assigneeUserId: data.assigneeId,
				taskTitle: data.title ?? existingTask.title,
			});
		}

		return this.toTaskOutput(task as Task & { assignee: User | null });
	}

	async deleteTask(taskId: string, userId: string): Promise<void> {
		// Get user to get their tenantId
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError("User not found");
		}

		// Check if task exists and belongs to user's tenant
		const existingTask = await this.taskRepository.findByIdAndTenant(
			taskId,
			user.tenantId,
		);
		if (!existingTask) {
			throw new NotFoundError("Task not found or not accessible");
		}

		// Delete task
		await this.taskRepository.delete(taskId, user.tenantId);
	}

	async getTasks(
		filters: {
			status?: string;
			assigneeId?: string | null;
		},
		pagination: {
			page: number;
			limit: number;
		},
		userId: string,
	): Promise<{
		data: TaskOutput[];
		pagination: {
			page: number;
			limit: number;
			totalPages: number;
			totalItems: number;
			hasNextPage: boolean;
			hasPreviousPage: boolean;
		};
	}> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError("User not found");
		}

		const tenantId = user.tenantId;

		if (pagination.page < 1) {
			throw new ValidationError("page must be >= 1");
		}
		if (pagination.limit < 1 || pagination.limit > 100) {
			throw new ValidationError("limit must be between 1 and 100");
		}

		if (filters.status !== undefined) {
			this.validateStatus(filters.status);
		}
		if (filters.assigneeId !== undefined && filters.assigneeId !== null) {
			await this.validateAssigneeInSameTenant(filters.assigneeId, tenantId);
		}

		const skip = (pagination.page - 1) * pagination.limit;

		const result = await this.taskRepository.findMany(
			tenantId,
			skip,
			pagination.limit,
			{
				status: filters.status,
				assigneeId: filters.assigneeId,
			},
		);

		const totalPages = Math.ceil(result.total / pagination.limit);

		return {
			data: result.tasks.map((task) =>
				this.toTaskOutput(task as Task & { assignee: User | null }),
			),
			pagination: {
				page: pagination.page,
				limit: pagination.limit,
				totalPages,
				totalItems: result.total,
				hasNextPage: pagination.page < totalPages,
				hasPreviousPage: pagination.page > 1,
			},
		};
	}

	async findById(id: string): Promise<Task | null> {
		return this.taskRepository.findById(id);
	}

	private toTaskOutput(task: Task & { assignee: User | null }): TaskOutput {
		return {
			id: task.id,
			title: task.title,
			description: task.description,
			status: task.status,
			assigneeId: task.assigneeId,
			assignee: task.assignee
				? {
						id: task.assignee.id,
						email: task.assignee.email,
						firstName: task.assignee.firstName,
						lastName: task.assignee.lastName,
					}
				: null,
			createdAt: task.createdAt,
			updatedAt: task.updatedAt,
		};
	}
}
