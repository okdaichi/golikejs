#!/usr/bin/env -S deno run

/**
 * Example usage of the slog package.
 * This demonstrates the main features of the structured logging package.
 */

import { ConsoleHandler, JSONFormatter, Level, Logger, TextFormatter } from "./mod.ts";

// Example 1: Basic usage with JSON output
console.log("=== Example 1: Basic JSON Logging ===\n");
const jsonLogger = new Logger(
	new ConsoleHandler({ level: Level.Info, formatter: new JSONFormatter() }),
);
jsonLogger.info("Server started", { port: 8080, env: "production" });
jsonLogger.warn("High memory usage", { usage: "85%", threshold: "80%" });
jsonLogger.error("Database connection failed", new Error("Connection timeout"));
console.log("");

// Example 2: Text output for development
console.log("=== Example 2: Human-Readable Text Logging ===\n");
const textLogger = new Logger(
	new ConsoleHandler({ level: Level.Debug, formatter: new TextFormatter() }),
);
textLogger.debug("Processing request", { method: "GET", path: "/api/users" });
textLogger.info("Request completed", { duration: 42, status: 200 });
console.log("");

// Example 3: Context propagation for request tracking
console.log("=== Example 3: Context Propagation ===\n");
const rootLogger = new Logger(
	new ConsoleHandler({ level: Level.Info, formatter: new JSONFormatter() }),
);

// Simulate handling a request
function handleRequest(requestId: string, userId: string) {
	const reqLogger = rootLogger.with({ requestId, userId });
	reqLogger.info("Request received");

	// Simulate processing
	reqLogger.info("Fetching user data", { source: "database" });
	reqLogger.info("Request completed", { duration: 123 });
}

handleRequest("req-abc-123", "user-456");
console.log("");

// Example 4: Grouped logging for subsystems
console.log("=== Example 4: Grouped Logging ===\n");
const appLogger = new Logger(
	new ConsoleHandler({ level: Level.Info, formatter: new JSONFormatter() }),
);

// Database subsystem
const dbLogger = appLogger.withGroup("db");
dbLogger.info("Query executed", { table: "users", rows: 42, duration: 15 });
dbLogger.warn("Slow query detected", { table: "orders", duration: 500 });

// Cache subsystem
const cacheLogger = appLogger.withGroup("cache");
cacheLogger.info("Cache hit", { key: "user:123", ttl: 3600 });
cacheLogger.info("Cache miss", { key: "product:456" });
console.log("");

// Example 5: Nested groups and context
console.log("=== Example 5: Nested Groups ===\n");
const serviceLogger = rootLogger
	.withGroup("service")
	.with({ serviceName: "api", version: "1.0.0" });

const httpLogger = serviceLogger.withGroup("http");
httpLogger.info("Request received", { method: "POST", path: "/api/login" });

const authLogger = serviceLogger.withGroup("auth");
authLogger.info("Authentication successful", { provider: "oauth" });
console.log("");

// Example 6: Different value types
console.log("=== Example 6: Various Value Types ===\n");
textLogger.info("Demonstrating types", {
	string: "hello",
	number: 42,
	boolean: true,
	nullValue: null,
	date: new Date(),
	array: [1, 2, 3],
	object: { nested: "value" },
});
console.log("");

console.log("=== Examples completed! ===");
