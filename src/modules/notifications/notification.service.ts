import type { EmailProvider, SendEmailOptions } from "../../shared/email";
import { NotFoundError } from "../../shared/errors";
import { TaskRepository } from "../tasks/task.repository";
import { UserRepository } from "../users/user.repository";

export class NotificationService {
	private taskRepository: TaskRepository;
	private userRepository: UserRepository;
	private emailProvider: EmailProvider;

	constructor(
		taskRepository?: TaskRepository,
		userRepository?: UserRepository,
		emailProvider?: EmailProvider,
	) {
		this.taskRepository = taskRepository || new TaskRepository();
		this.userRepository = userRepository || new UserRepository();
		this.emailProvider = emailProvider || this.createDummyEmailProvider();
	}

	private createDummyEmailProvider(): EmailProvider {
		return {
			async send(options: SendEmailOptions): Promise<void> {
				console.log("[NotificationService] Sending email via dummy provider:");
				console.log(`  To: ${options.to}`);
				console.log(`  Subject: ${options.subject}`);
				console.log(`  Text: ${options.text}`);
				console.log("----------------------------------------");
			},
		};
	}

	async sendTaskAssignmentNotification(
		taskId: string,
		assigneeUserId: string,
		taskTitle?: string,
	): Promise<void> {
		const task = await this.taskRepository.findById(taskId);
		if (!task) {
			throw new NotFoundError(`Task not found: ${taskId}`);
		}

		const assigneeUser = await this.userRepository.findById(assigneeUserId);
		if (!assigneeUser) {
			throw new NotFoundError(`Assignee user not found: ${assigneeUserId}`);
		}

		if (task.tenantId !== assigneeUser.tenantId) {
			throw new Error(
				`Task and assignee belong to different tenants: task tenant ${task.tenantId}, assignee tenant ${assigneeUser.tenantId}`,
			);
		}

		const taskTitleOrId = taskTitle || task.title || `Task ${taskId}`;
		const assigneeName =
			`${assigneeUser.firstName || ""} ${assigneeUser.lastName || ""}`.trim() ||
			assigneeUser.email;

		const emailOptions: SendEmailOptions = {
			to: assigneeUser.email,
			subject: `You have been assigned to a task: ${taskTitleOrId}`,
			text: `
Hello ${assigneeName},

You have been assigned to the following task:

Task ID: ${task.id}
Title: ${task.title || "No title"}
Description: ${task.description || "No description"}
Status: ${task.status}

You can view this task in the TaskFlow application.

Best regards,
TaskFlow Team
      `.trim(),
			html: `
        <p>Hello ${assigneeName},</p>
        <p>You have been assigned to the following task:</p>
        <ul>
          <li><strong>Task ID:</strong> ${task.id}</li>
          <li><strong>Title:</strong> ${task.title || "No title"}</li>
          <li><strong>Description:</strong> ${task.description || "No description"}</li>
          <li><strong>Status:</strong> ${task.status}</li>
        </ul>
        <p>You can view this task in the TaskFlow application.</p>
        <p>Best regards,<br/>TaskFlow Team</p>
      `,
		};

		await this.emailProvider.send(emailOptions);
	}

	async processTaskAssignmentNotification(
		taskId: string,
		assigneeUserId: string,
		taskTitle?: string,
	): Promise<void> {
		try {
			await this.sendTaskAssignmentNotification(
				taskId,
				assigneeUserId,
				taskTitle,
			);
			console.log(
				`[NotificationService] Successfully processed notification for task ${taskId} assigned to user ${assigneeUserId}`,
			);
		} catch (error) {
			console.error(
				`[NotificationService] Failed to process notification for task ${taskId} assigned to user ${assigneeUserId}:`,
				error,
			);
			throw error;
		}
	}
}
