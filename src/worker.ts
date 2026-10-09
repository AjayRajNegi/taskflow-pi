import "dotenv/config";
import { QueueService } from "./infrastructure/queue";
import { NotificationService } from "./modules/notifications";
import { DummyEmailProvider } from "./shared/email";
import { logger } from "./shared/logging/logger";

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
	logger.info("Received shutdown signal, closing queue and worker...");
	await notificationWorker.close();
	await queueService.close();
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

logger.info("Notification worker started and listening for jobs...");
