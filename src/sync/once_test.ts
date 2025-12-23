import { assertEquals, assertRejects } from "@std/assert";
import { Once } from "./once.ts";

Deno.test("Once.do - executes function exactly once", async () => {
	const once = new Once();
	let count = 0;
	const fn = async () => {
		count++;
		return count;
	};

	// Call multiple times sequentially
	const result1 = await once.do(fn);
	const result2 = await once.do(fn);
	const result3 = await once.do(fn);

	assertEquals(count, 1);
	assertEquals(result1, 1);
	assertEquals(result2, 1);
	assertEquals(result3, 1);
});

Deno.test("Once.do - handles concurrent calls", async () => {
	const once = new Once();
	let count = 0;
	const fn = async () => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		count++;
		return count;
	};

	// Call multiple times concurrently
	const results = await Promise.all([
		once.do(fn),
		once.do(fn),
		once.do(fn),
		once.do(fn),
		once.do(fn),
	]);

	assertEquals(count, 1);
	assertEquals(results, [1, 1, 1, 1, 1]);
});

Deno.test("Once.do - marks as done even on error", async () => {
	const once = new Once();
	let count = 0;
	const fn = async () => {
		count++;
		throw new Error("test error");
	};

	// First call should throw
	await assertRejects(
		() => once.do(fn),
		Error,
		"test error",
	);

	// Function should have been called once
	assertEquals(count, 1);

	// Second call should not execute function again, but should still reject
	await assertRejects(
		() => once.do(fn),
		Error,
		"test error",
	);

	// Function should still have been called only once
	assertEquals(count, 1);
});

Deno.test("Once.do - handles sync functions", async () => {
	const once = new Once();
	let count = 0;
	const fn = () => {
		count++;
		return count;
	};

	const result1 = await once.do(fn);
	const result2 = await once.do(fn);

	assertEquals(count, 1);
	assertEquals(result1, 1);
	assertEquals(result2, 1);
});

Deno.test("Once.do - preserves return value type", async () => {
	const once = new Once();
	const fn = async () => {
		return { value: 42, message: "hello" };
	};

	const result = await once.do(fn);
	assertEquals(result, { value: 42, message: "hello" });
});

Deno.test("Once.do - different instances are independent", async () => {
	const once1 = new Once();
	const once2 = new Once();
	let count1 = 0;
	let count2 = 0;

	await once1.do(() => count1++);
	await once1.do(() => count1++);
	await once2.do(() => count2++);
	await once2.do(() => count2++);

	assertEquals(count1, 1);
	assertEquals(count2, 1);
});

Deno.test("Once.do - handles void return", async () => {
	const once = new Once();
	let executed = false;
	const fn = async () => {
		executed = true;
	};

	await once.do(fn);
	await once.do(fn);

	assertEquals(executed, true);
});

Deno.test("Once.do - racing with no delay", async () => {
	const once = new Once();
	let count = 0;
	const fn = () => {
		count++;
		return count;
	};

	// Race multiple immediate calls
	const results = await Promise.all([
		once.do(fn),
		once.do(fn),
		once.do(fn),
	]);

	assertEquals(count, 1);
	assertEquals(results, [1, 1, 1]);
});

Deno.test("Once.do - error propagates to all waiters", async () => {
	const once = new Once();
	const error = new Error("initialization failed");
	const fn = async () => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		throw error;
	};

	const promises = [
		once.do(fn),
		once.do(fn),
		once.do(fn),
	];

	// All promises should reject with the same error
	for (const promise of promises) {
		await assertRejects(() => promise, Error, "initialization failed");
	}
});
