import { type Job, Queue, Worker } from "bullmq";
import type { NotificationService } from "../../modules/notifications";
import type { EmailProvider } from "../../shared/email";
import { logger } from "../../shared/logging/logger";

export interface NotificationJobData {
	taskId: string;
	assigneeUserId: string;
	taskTitle?: string;
}

export class QueueService {
	private notificationQueue: Queue;
	private redisConnectionOptions: Record<string, any>;

	constructor() {
		const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

		try {
			const url = new URL(redisUrl);
			this.redisConnectionOptions = {
				host: url.hostname,
				port: parseInt(url.port),
				username: url.username || undefined,
				password: url.password || undefined,
				db: parseInt(url.pathname.substring(1)) || 0,
			};
		} catch (error) {
			logger.warn("Failed to parse REDIS_URL, using default localhost:6379", {
				error,
			});
			this.redisConnectionOptions = {
				host: "localhost",
				port: 6379,
			};
		}

		this.notificationQueue = new Queue("task-notifications", {
			connection: this.redisConnectionOptions,
		});

		(this.notificationQueue as any).on("waiting", (jobId: string) => {
			logger.debug(`Job ${jobId} is waiting to be processed`, { jobId });
		});

		(this.notificationQueue as any).on("active", (job: Job) => {
			logger.debug(`Job ${job.id} is now processing`, { jobId: job.id });
		});

		(this.notificationQueue as any).on("completed", (job: Job) => {
			logger.info(`Job ${job.id} has completed`, { jobId: job.id });
		});

		(this.notificationQueue as any).on("failed", (job: Job, error: Error) => {
			logger.error(`Job ${job.id} has failed`, {
				jobId: job.id,
				error: error.message,
			});
		});
	}

	async addNotificationJob(data: NotificationJobData): Promise<void> {
		await this.notificationQueue.add(
			"send-task-assignment-notification",
			data,
			{
				attempts: 3,
				backoff: {
					type: "exponential",
					delay: 1000,
				},
				removeOnComplete: true,
				removeOnFail: false,
			},
		);
	}

	createNotificationWorker(
		emailProvider: EmailProvider,
		notificationService: NotificationService,
	): Worker {
		return new Worker(
			"task-notifications",
			async (job: Job<NotificationJobData>) => {
				await notificationService.processTaskAssignmentNotification(
					job.data.taskId,
					job.data.assigneeUserId,
					job.data.taskTitle,
				);
			},
			{
				connection: this.redisConnectionOptions,
			},
		);
	}

	async close(): Promise<void> {
		await this.notificationQueue.close();
	}
}
