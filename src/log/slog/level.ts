/**
 * Log levels for structured logging.
 * Levels are ordered from least to most severe: Debug < Info < Warn < Error.
 */
export enum Level {
	Debug = 0,
	Info = 1,
	Warn = 2,
	Error = 3,
}

/**
 * Convert a level to its string representation.
 */
export function levelToString(level: Level): string {
	switch (level) {
		case Level.Debug:
			return "DEBUG";
		case Level.Info:
			return "INFO";
		case Level.Warn:
			return "WARN";
		case Level.Error:
			return "ERROR";
		default:
			return "UNKNOWN";
	}
}

/**
 * Parse a string into a Level, case-insensitive.
 * Returns undefined if the string is not a valid level.
 */
export function parseLevel(s: string): Level | undefined {
	const upper = s.toUpperCase();
	switch (upper) {
		case "DEBUG":
			return Level.Debug;
		case "INFO":
			return Level.Info;
		case "WARN":
			return Level.Warn;
		case "ERROR":
			return Level.Error;
		default:
			return undefined;
	}
}
