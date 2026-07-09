/**
 * Structured logging package inspired by Go's log/slog.
 *
 * This module provides a lightweight structured logging solution with levels,
 * handlers, formatters, and context propagation. It supports both text and JSON
 * output formats and allows pluggable output targets.
 *
 * Features:
 * - Log levels: Debug, Info, Warn, Error
 * - Context propagation with {@link Logger.with} and {@link Logger.withGroup}
 * - Multiple output formats: {@link TextFormatter}, {@link JSONFormatter}
 * - Pluggable handlers: {@link ConsoleHandler}, {@link FileHandler}
 * - Deterministic output (sorted keys) for testing
 *
 * Usage example:
 * ```ts
 * import { Logger, ConsoleHandler, JSONFormatter, Level } from "@okudai/golikejs/log/slog";
 *
 * // Create a logger with JSON output
 * const root = new Logger(new ConsoleHandler({ level: Level.Info, formatter: new JSONFormatter() }));
 *
 * // Log with context
 * const reqLogger = root.with({ requestId: "abc" });
 * reqLogger.info("started", ["user", 123], ["size", 42]);
 * reqLogger.error("failed", new Error("boom"));
 *
 * // Use groups for nested context
 * const dbLogger = root.withGroup("db");
 * dbLogger.info("query", { table: "users", duration: 42 });
 * // Output will have keys: db.table, db.duration
 * ```
 *
 * @module @okudai/golikejs/log/slog
 */

export { Level, levelToString, parseLevel } from "./level.ts";
export { type LogRecord } from "./formatter.ts";
export { type Formatter, JSONFormatter, TextFormatter } from "./formatter.ts";
export { ConsoleHandler, FileHandler, type Handler, type HandlerOptions } from "./handler.ts";
export { type KV, Logger } from "./logger.ts";

// Re-export for convenience
import { ConsoleHandler } from "./handler.ts";
import { JSONFormatter } from "./formatter.ts";
import { Level } from "./level.ts";
import { Logger } from "./logger.ts";

/**
 * Create a default logger with console output and JSON formatting.
 * Uses Info level by default.
 */
export function defaultLogger(level: Level = Level.Info): Logger {
	return new Logger(
		new ConsoleHandler({ level, formatter: new JSONFormatter() }),
	);
}
