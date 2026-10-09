import { logger } from "../logging/logger";
import type { EmailProvider, SendEmailOptions } from "./email.provider";

export class DummyEmailProvider implements EmailProvider {
	async send(options: SendEmailOptions): Promise<void> {
		// In a real implementation, this would send an email
		// For now, we'll just log the email metadata at debug level
		logger.debug("[DummyEmailProvider] Sending email:", {
			to: options.to,
			subject: options.subject,
			hasText: !!options.text,
			hasHtml: !!options.html,
		});
	}
}
