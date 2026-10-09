import { getRequestContext } from "./requestIdStorage";

export type LogLevel = "error" | "warn" | "info" | "debug";

const levelValues: Record<LogLevel, number> = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
};

export class Logger {
	private level: LogLevel;

	constructor(level: LogLevel = "info") {
		this.level = level;
	}

	setLevel(level: LogLevel): void {
		this.level = level;
	}

	private shouldLog(level: LogLevel): boolean {
		return levelValues[level] <= levelValues[this.level];
	}

	private createLogObject(
		level: LogLevel,
		message: string,
		meta?: Record<string, unknown>,
	) {
		const log: Record<string, unknown> = {
			timestamp: new Date().toISOString(),
			level,
			message,
		};
		const context = getRequestContext();
		if (context) {
			log.requestId = context.requestId;
			if (context.userId) {
				log.userId = context.userId;
			}
			if (context.tenantId) {
				log.tenantId = context.tenantId;
			}
		}
		if (meta && Object.keys(meta).length > 0) {
			// Ensure we don't log sensitive keys? We'll trust caller.
			log.meta = meta;
		}
		return log;
	}

	error(message: string, meta?: Record<string, unknown>): void {
		if (this.shouldLog("error")) {
			console.error(
				JSON.stringify(this.createLogObject("error", message, meta)),
			);
		}
	}

	warn(message: string, meta?: Record<string, unknown>): void {
		if (this.shouldLog("warn")) {
			console.warn(JSON.stringify(this.createLogObject("warn", message, meta)));
		}
	}

	info(message: string, meta?: Record<string, unknown>): void {
		if (this.shouldLog("info")) {
			console.info(JSON.stringify(this.createLogObject("info", message, meta)));
		}
	}

	debug(message: string, meta?: Record<string, unknown>): void {
		if (this.shouldLog("debug")) {
			console.debug(
				JSON.stringify(this.createLogObject("debug", message, meta)),
			);
		}
	}
}

// Singleton instance
const logger = new Logger((process.env.LOG_LEVEL as LogLevel) ?? "info");

export { logger };
