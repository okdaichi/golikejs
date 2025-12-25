# log/slog

Structured logging package inspired by Go's `log/slog`.

## Overview

This package provides a lightweight structured logging solution with:

- **Log levels**: Debug, Info, Warn, Error
- **Context propagation**: Add persistent key-value pairs with `with()` and group keys with `withGroup()`
- **Multiple output formats**: Text and JSON formatters
- **Pluggable handlers**: Console and file output
- **Deterministic output**: Sorted keys for stable testing

## Quick Start

```ts
import { ConsoleHandler, JSONFormatter, Level, Logger } from "@okudai/golikejs/log/slog";

// Create a logger with JSON output to console
const logger = new Logger(
	new ConsoleHandler({
		level: Level.Info,
		formatter: new JSONFormatter(),
	}),
);

// Simple logging
logger.info("server started", { port: 8080 });
logger.error("connection failed", new Error("timeout"));

// Context propagation
const reqLogger = logger.with({ requestId: "abc-123" });
reqLogger.info("processing request", { method: "GET", path: "/api/users" });

// Grouped keys
const dbLogger = logger.withGroup("db");
dbLogger.info("query executed", { table: "users", duration: 42 });
// Output will have keys: db.table, db.duration
```

## Log Levels

Levels are ordered from least to most severe:

- `Level.Debug` (0) - Detailed debugging information
- `Level.Info` (1) - General informational messages
- `Level.Warn` (2) - Warning messages
- `Level.Error` (3) - Error messages

Handlers can be configured with a minimum level to filter out less severe logs.

## Logging Methods

```ts
logger.debug("debug message", { key: "value" });
logger.info("info message", { key: "value" });
logger.warn("warning message", { key: "value" });
logger.error("error message", { key: "value" });
```

### Key-Value Arguments

Logger methods accept multiple forms for key-value pairs:

```ts
// Object form
logger.info("message", { key1: "value1", key2: "value2" });

// Tuple form
logger.info("message", ["key", "value"]);

// Multiple tuples
logger.info("message", ["key1", "value1"], ["key2", "value2"]);

// Mixed forms
logger.info("message", { key1: "value1" }, ["key2", "value2"]);

// With error
logger.error("failed", { context: "test" }, new Error("boom"));
```

## Context Propagation

### with()

Create a derived logger with additional context fields:

```ts
const baseLogger = new Logger(handler);
const requestLogger = baseLogger.with({ requestId: "123", userId: "456" });

requestLogger.info("processing");
// Output includes: requestId=123, userId=456
```

### withGroup()

Create a derived logger that prefixes all subsequent keys with a group name:

```ts
const baseLogger = new Logger(handler);
const dbLogger = baseLogger.withGroup("database");

dbLogger.info("query", { table: "users", rows: 10 });
// Output includes: database.table=users, database.rows=10
```

Groups can be nested:

```ts
const appLogger = logger.withGroup("app");
const dbLogger = appLogger.withGroup("db");
dbLogger.info("query", { time: 42 });
// Output includes: app.db.time=42
```

## Handlers

### ConsoleHandler

Writes formatted logs to the console:

```ts
import { ConsoleHandler, Level, TextFormatter } from "@okudai/golikejs/log/slog";

const handler = new ConsoleHandler({
	level: Level.Debug,
	formatter: new TextFormatter(),
});
```

- Uses `console.log()` for Debug and Info levels
- Uses `console.error()` for Warn and Error levels

### FileHandler

Appends formatted logs to a file:

```ts
import { FileHandler, JSONFormatter, Level } from "@okudai/golikejs/log/slog";

const handler = new FileHandler("/var/log/app.log", {
	level: Level.Info,
	formatter: new JSONFormatter(),
});
```

## Formatters

### TextFormatter

Produces human-readable text output:

```
2024-01-01T12:00:00.000Z INFO server started port=8080 service="api"
```

Format: `ISO_TIMESTAMP LEVEL message key1=val1 key2=val2 ...`

Keys are sorted alphabetically for deterministic output.

### JSONFormatter

Produces JSON output, one object per line:

```json
{
	"timestamp": "2024-01-01T12:00:00.000Z",
	"level": "INFO",
	"message": "server started",
	"port": 8080,
	"service": "api"
}
```

Keys are sorted alphabetically for deterministic output.

## Custom Handlers

Implement the `Handler` interface to create custom handlers:

```ts
import { Handler, LogRecord } from "@okudai/golikejs/log/slog";

class CustomHandler implements Handler {
	async handle(record: LogRecord): Promise<void> {
		// Custom handling logic
	}
}
```

## Testing

The deterministic output (sorted keys, ISO timestamps) makes it easy to test logs:

```ts
import { assertEquals } from "@std/assert";
import { JSONFormatter, Logger, LogRecord } from "@okudai/golikejs/log/slog";

Deno.test("logs contain expected data", () => {
	const records: LogRecord[] = [];
	const handler = {
		handle(record: LogRecord) {
			records.push(record);
		},
	};

	const logger = new Logger(handler);
	logger.info("test", { key: "value" });

	assertEquals(records[0].message, "test");
	assertEquals(records[0].keys.key, "value");
});
```

## Migration from Go's log/slog

This package follows Go's `log/slog` design principles but adapts to TypeScript/JavaScript idioms:

| Go                                 | TypeScript                                 |
| ---------------------------------- | ------------------------------------------ |
| `slog.Info("msg", "key", "value")` | `logger.info("msg", ["key", "value"])`     |
| `slog.With("key", "value")`        | `logger.with({ key: "value" })`            |
| `slog.Default()`                   | `defaultLogger()`                          |
| `slog.SetDefault(logger)`          | Not implemented (use dependency injection) |
| Context integration                | Not implemented (use `with()` for context) |

## API Reference

See the module documentation for detailed API information.
