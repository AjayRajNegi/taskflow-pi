import "dotenv/config";
import { QueueService } from "./infrastructure/queue";
import { NotificationService } from "./modules/notifications";
import { DummyEmailProvider } from "./shared/email";

const queueService = new QueueService();
const notificationService = new NotificationService(
	undefined,
	undefined,
	new DummyEmailProvider(),
);

const notificationWorker = queueService.createNotificationWorker(
	new DummyEmailProvider(),
	notificationService,
);

async function shutdown() {
	console.log("Received shutdown signal, closing queue and worker...");
	await notificationWorker.close();
	await queueService.close();
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("Notification worker started and listening for jobs...");
