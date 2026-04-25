import { assertEquals, assertMatch } from "@std/assert";
import { ConsoleHandler, FileHandler } from "./handler.ts";
import { JSONFormatter, TextFormatter } from "./formatter.ts";
import { Level } from "./level.ts";
import { Logger } from "./logger.ts";

Deno.test("slog - JSONFormatter emits single-line JSON with sorted keys", () => {
	const formatter = new JSONFormatter();
	const record = {
		timestamp: "2024-01-01T00:00:00.000Z",
		level: Level.Info,
		message: "test message",
		keys: { zebra: 1, apple: 2, banana: 3 },
	};

	const result = formatter.format(record);

	// Should be valid JSON
	const parsed = JSON.parse(result);
	assertEquals(parsed.timestamp, "2024-01-01T00:00:00.000Z");
	assertEquals(parsed.level, "INFO");
	assertEquals(parsed.message, "test message");
	assertEquals(parsed.apple, 2);
	assertEquals(parsed.banana, 3);
	assertEquals(parsed.zebra, 1);

	// Keys should appear in sorted order in the JSON string
	// (Note: JSON.stringify with sorted keys depends on insertion order)
	const keys = Object.keys(parsed);
	const dataKeys = keys.filter((k) => !["timestamp", "level", "message"].includes(k));
	assertEquals(dataKeys, ["apple", "banana", "zebra"]);
});

Deno.test("slog - JSONFormatter includes error details", () => {
	const formatter = new JSONFormatter();
	const error = new Error("test error");
	const record = {
		timestamp: "2024-01-01T00:00:00.000Z",
		level: Level.Error,
		message: "error occurred",
		keys: {},
		error,
	};

	const result = formatter.format(record);
	const parsed = JSON.parse(result);

	assertEquals(parsed.error, "test error");
	assertEquals(typeof parsed.stack, "string");
});

Deno.test("slog - TextFormatter produces readable text with sorted keys", () => {
	const formatter = new TextFormatter();
	const record = {
		timestamp: "2024-01-01T00:00:00.000Z",
		level: Level.Warn,
		message: "warning message",
		keys: { zebra: "z", apple: "a", banana: "b" },
	};

	const result = formatter.format(record);

	// Should contain all parts in order
	assertEquals(
		result,
		'2024-01-01T00:00:00.000Z WARN warning message apple="a" banana="b" zebra="z"',
	);
});

Deno.test("slog - Logger.with() merges context without mutating parent", () => {
	const records: unknown[] = [];
	const mockHandler = {
		handle(record: unknown) {
			records.push(record);
		},
	};

	const root = new Logger(mockHandler);
	const child = root.with({ requestId: "123" });

	root.info("root message", { key: "value" });
	child.info("child message", { key: "value" });

	assertEquals(records.length, 2);

	const rootRecord = records[0] as {
		message: string;
		keys: Record<string, unknown>;
	};
	const childRecord = records[1] as {
		message: string;
		keys: Record<string, unknown>;
	};

	// Root should not have requestId
	assertEquals(rootRecord.keys.requestId, undefined);
	assertEquals(rootRecord.keys.key, "value");

	// Child should have requestId
	assertEquals(childRecord.keys.requestId, "123");
	assertEquals(childRecord.keys.key, "value");
});

Deno.test("slog - Logger.withGroup() prefixes keys", () => {
	const records: unknown[] = [];
	const mockHandler = {
		handle(record: unknown) {
			records.push(record);
		},
	};

	const root = new Logger(mockHandler);
	const grouped = root.withGroup("db");

	grouped.info("query", { table: "users", duration: 42 });

	assertEquals(records.length, 1);
	const record = records[0] as { keys: Record<string, unknown> };

	assertEquals(record.keys["db.table"], "users");
	assertEquals(record.keys["db.duration"], 42);
});

Deno.test("slog - Handler level filtering ignores lower levels", () => {
	const records: unknown[] = [];
	const mockFormatter = {
		format() {
			return "formatted";
		},
	};

	// Create handler with Info level
	const handler = new ConsoleHandler({
		level: Level.Info,
		formatter: mockFormatter,
	});

	// Capture console output
	const originalLog = console.log;
	const originalError = console.error;
	const outputs: string[] = [];

	console.log = (msg: string) => outputs.push(msg);
	console.error = (msg: string) => outputs.push(msg);

	try {
		const logger = new Logger(handler);

		logger.debug("debug message"); // Should be filtered
		logger.info("info message"); // Should pass
		logger.warn("warn message"); // Should pass
		logger.error("error message"); // Should pass

		// Only 3 messages should be logged (debug filtered out)
		assertEquals(outputs.length, 3);
	} finally {
		console.log = originalLog;
		console.error = originalError;
	}
});

Deno.test("slog - Logger accepts different KV forms", () => {
	const records: unknown[] = [];
	const mockHandler = {
		handle(record: unknown) {
			records.push(record);
		},
	};

	const logger = new Logger(mockHandler);

	// Object form
	logger.info("test1", { key1: "value1" });

	// Tuple form
	logger.info("test2", ["key2", "value2"]);

	// Multiple tuples
	logger.info("test3", ["key3", "value3"], ["key4", "value4"]);

	// Mixed
	logger.info("test4", { key5: "value5" }, ["key6", "value6"]);

	assertEquals(records.length, 4);

	const record1 = records[0] as { keys: Record<string, unknown> };
	assertEquals(record1.keys.key1, "value1");

	const record2 = records[1] as { keys: Record<string, unknown> };
	assertEquals(record2.keys.key2, "value2");

	const record3 = records[2] as { keys: Record<string, unknown> };
	assertEquals(record3.keys.key3, "value3");
	assertEquals(record3.keys.key4, "value4");

	const record4 = records[3] as { keys: Record<string, unknown> };
	assertEquals(record4.keys.key5, "value5");
	assertEquals(record4.keys.key6, "value6");
});

Deno.test("slog - Logger handles Error argument", () => {
	const records: unknown[] = [];
	const mockHandler = {
		handle(record: unknown) {
			records.push(record);
		},
	};

	const logger = new Logger(mockHandler);
	const error = new Error("test error");

	logger.error("error occurred", { context: "test" }, error);

	assertEquals(records.length, 1);
	const record = records[0] as {
		error?: Error;
		keys: Record<string, unknown>;
	};

	assertEquals(record.error?.message, "test error");
	assertEquals(record.keys.context, "test");
});

Deno.test("slog - Logger generates ISO timestamp", () => {
	const records: unknown[] = [];
	const mockHandler = {
		handle(record: unknown) {
			records.push(record);
		},
	};

	const logger = new Logger(mockHandler);
	logger.info("test");

	assertEquals(records.length, 1);
	const record = records[0] as { timestamp: string };

	// Should be valid ISO timestamp
	assertMatch(record.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

	// Should be a valid date
	const date = new Date(record.timestamp);
	assertEquals(isNaN(date.getTime()), false);
});

Deno.test("slog - FileHandler appends to file", async () => {
	const tempFile = await Deno.makeTempFile();

	try {
		const handler = new FileHandler(tempFile, {
			level: Level.Info,
			formatter: new JSONFormatter(),
		});
		const logger = new Logger(handler);

		await logger.info("message 1", { key: "value1" });
		await logger.info("message 2", { key: "value2" });

		// Give async writes time to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		const content = await Deno.readTextFile(tempFile);
		const lines = content.trim().split("\n");

		assertEquals(lines.length, 2);

		const record1 = JSON.parse(lines[0]);
		assertEquals(record1.message, "message 1");
		assertEquals(record1.key, "value1");

		const record2 = JSON.parse(lines[1]);
		assertEquals(record2.message, "message 2");
		assertEquals(record2.key, "value2");
	} finally {
		await Deno.remove(tempFile);
	}
});

Deno.test("slog - Nested with() and withGroup()", () => {
	const records: unknown[] = [];
	const mockHandler = {
		handle(record: unknown) {
			records.push(record);
		},
	};

	const root = new Logger(mockHandler);
	const withContext = root.with({ service: "api" });
	const withGroup = withContext.withGroup("request");
	const final = withGroup.with({ id: "123" });

	final.info("processing", { method: "GET" });

	assertEquals(records.length, 1);
	const record = records[0] as { keys: Record<string, unknown> };

	assertEquals(record.keys.service, "api");
	assertEquals(record.keys["request.id"], "123");
	assertEquals(record.keys["request.method"], "GET");
});
