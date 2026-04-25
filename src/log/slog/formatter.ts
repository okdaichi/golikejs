import { type Level, levelToString } from "./level.ts";

/**
 * LogRecord represents a single log entry with timestamp, level, message, and key-value pairs.
 */
export interface LogRecord {
	timestamp: string; // ISO 8601 timestamp
	level: Level;
	message: string;
	keys: Record<string, unknown>; // key-value pairs
	error?: Error;
}

/**
 * Formatter interface for converting log records to strings.
 */
export interface Formatter {
	format(record: LogRecord): string;
}

/**
 * TextFormatter produces human-readable text output.
 * Format: "ISO LEVEL message key=val ..."
 * Keys are sorted alphabetically for deterministic output.
 */
export class TextFormatter implements Formatter {
	format(record: LogRecord): string {
		const parts: string[] = [
			record.timestamp,
			levelToString(record.level),
			record.message,
		];

		// Sort keys for deterministic output
		const keys = Object.keys(record.keys).sort();
		for (const key of keys) {
			const value = record.keys[key];
			parts.push(`${key}=${formatValue(value)}`);
		}

		// Add error if present
		if (record.error) {
			parts.push(`error=${record.error.message}`);
		}

		return parts.join(" ");
	}
}

/**
 * JSONFormatter produces JSON output, one object per line.
 * Keys are sorted alphabetically for deterministic output.
 */
export class JSONFormatter implements Formatter {
	format(record: LogRecord): string {
		// Build JSON object with sorted keys
		const obj: Record<string, unknown> = {
			timestamp: record.timestamp,
			level: levelToString(record.level),
			message: record.message,
		};

		// Add sorted keys
		const keys = Object.keys(record.keys).sort();
		for (const key of keys) {
			obj[key] = record.keys[key];
		}

		// Add error if present
		if (record.error) {
			obj.error = record.error.message;
			if (record.error.stack) {
				obj.stack = record.error.stack;
			}
		}

		return JSON.stringify(obj);
	}
}

/**
 * Helper to format a value for text output.
 */
function formatValue(value: unknown): string {
	if (value === null) return "null";
	if (value === undefined) return "undefined";
	if (typeof value === "string") return `"${value}"`;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	if (value instanceof Date) return value.toISOString();
	return JSON.stringify(value);
}
