import { Level } from "./level.ts";
import { type Handler } from "./handler.ts";
import { type LogRecord } from "./formatter.ts";

/**
 * Key-value pair type for logger arguments.
 * Can be an object, a tuple [key, value], or alternating key-value arguments.
 */
export type KV = Record<string, unknown> | [string, unknown];

/**
 * Logger provides structured logging with context propagation.
 */
export class Logger {
	private readonly handler: Handler;
	private readonly contextKeys: Record<string, unknown>;
	private readonly groupPrefix: string;

	constructor(
		handler: Handler,
		contextKeys: Record<string, unknown> = {},
		groupPrefix = "",
	) {
		this.handler = handler;
		this.contextKeys = contextKeys;
		this.groupPrefix = groupPrefix;
	}

	/**
	 * Log a debug-level message.
	 */
	debug(message: string, ...args: (KV | Error)[]): void {
		this.log(Level.Debug, message, ...args);
	}

	/**
	 * Log an info-level message.
	 */
	info(message: string, ...args: (KV | Error)[]): void {
		this.log(Level.Info, message, ...args);
	}

	/**
	 * Log a warning-level message.
	 */
	warn(message: string, ...args: (KV | Error)[]): void {
		this.log(Level.Warn, message, ...args);
	}

	/**
	 * Log an error-level message.
	 */
	error(message: string, ...args: (KV | Error)[]): void {
		this.log(Level.Error, message, ...args);
	}

	/**
	 * Create a derived logger with additional context fields.
	 * Does not mutate the parent logger.
	 */
	with(fields: Record<string, unknown>): Logger {
		const newKeys = { ...this.contextKeys };
		for (const [key, value] of Object.entries(fields)) {
			const finalKey = this.groupPrefix ? `${this.groupPrefix}.${key}` : key;
			newKeys[finalKey] = value;
		}
		return new Logger(this.handler, newKeys, this.groupPrefix);
	}

	/**
	 * Create a derived logger with a group prefix.
	 * All subsequent keys added will be prefixed with the group name.
	 * Does not mutate the parent logger.
	 */
	withGroup(name: string): Logger {
		const prefix = this.groupPrefix ? `${this.groupPrefix}.${name}` : name;
		return new Logger(this.handler, { ...this.contextKeys }, prefix);
	}

	/**
	 * Internal log method that processes arguments and calls the handler.
	 */
	private log(level: Level, message: string, ...args: (KV | Error)[]): void {
		// Merge context keys with arguments
		const keys: Record<string, unknown> = { ...this.contextKeys };
		let error: Error | undefined;

		for (const arg of args) {
			if (arg instanceof Error) {
				error = arg;
			} else if (Array.isArray(arg)) {
				// Tuple form: [key, value]
				const [key, value] = arg;
				const finalKey = this.groupPrefix ? `${this.groupPrefix}.${key}` : key;
				keys[finalKey] = value;
			} else if (typeof arg === "object" && arg !== null) {
				// Object form: { key: value, ... }
				for (const [key, value] of Object.entries(arg)) {
					const finalKey = this.groupPrefix ? `${this.groupPrefix}.${key}` : key;
					keys[finalKey] = value;
				}
			}
		}

		// Create record
		const record: LogRecord = {
			timestamp: new Date().toISOString(),
			level,
			message,
			keys,
			error,
		};

		// Call handler (may be sync or async)
		const result = this.handler.handle(record);
		if (result instanceof Promise) {
			result.catch((err) => {
				console.error("Logger handler error:", err);
			});
		}
	}
}
