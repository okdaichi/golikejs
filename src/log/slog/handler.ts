import { Level } from "./level.ts";
import { type Formatter, JSONFormatter, type LogRecord } from "./formatter.ts";

/**
 * Handler processes log records.
 */
export interface Handler {
	handle(record: LogRecord): Promise<void> | void;
}

/**
 * Options for configuring a handler.
 */
export interface HandlerOptions {
	level?: Level;
	formatter?: Formatter;
}

/**
 * ConsoleHandler writes formatted log records to the console.
 * Uses console.log for Debug/Info and console.error for Warn/Error.
 */
export class ConsoleHandler implements Handler {
	private readonly minLevel: Level;
	private readonly formatter: Formatter;

	constructor(options: HandlerOptions = {}) {
		this.minLevel = options.level ?? Level.Info;
		this.formatter = options.formatter ?? new JSONFormatter();
	}

	handle(record: LogRecord): void {
		// Filter by level
		if (record.level < this.minLevel) {
			return;
		}

		const formatted = this.formatter.format(record);

		// Use console.error for warnings and errors
		if (record.level >= Level.Warn) {
			console.error(formatted);
		} else {
			console.log(formatted);
		}
	}
}

/**
 * FileHandler appends formatted log records to a file.
 */
export class FileHandler implements Handler {
	private readonly minLevel: Level;
	private readonly formatter: Formatter;
	private readonly path: string;

	constructor(path: string, options: HandlerOptions = {}) {
		this.path = path;
		this.minLevel = options.level ?? Level.Info;
		this.formatter = options.formatter ?? new JSONFormatter();
	}

	async handle(record: LogRecord): Promise<void> {
		// Filter by level
		if (record.level < this.minLevel) {
			return;
		}

		const formatted = this.formatter.format(record) + "\n";
		await Deno.writeTextFile(this.path, formatted, { append: true });
	}
}
