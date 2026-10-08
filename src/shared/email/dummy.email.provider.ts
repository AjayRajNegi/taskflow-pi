import type { EmailProvider, SendEmailOptions } from "./email.provider";

export class DummyEmailProvider implements EmailProvider {
	async send(options: SendEmailOptions): Promise<void> {
		// In a real implementation, this would send an email
		// For now, we'll just log the email details
		console.log("[DummyEmailProvider] Sending email:");
		console.log(`  To: ${options.to}`);
		console.log(`  Subject: ${options.subject}`);
		console.log(`  Text: ${options.text}`);
		if (options.html) {
			console.log(`  HTML: ${options.html}`);
		}
		console.log("----------------------------------------");
	}
}
