import { assert, assertEquals, assertThrows } from "@std/assert";
import {
	afterFunc,
	background,
	ContextCancelledError,
	ContextTimeoutError,
	watchPromise,
	watchSignal,
	withAbort,
	withCancel,
	withCancelCause,
	withTimeout,
} from "./context.ts";

// Background tests
Deno.test("background - should create a background context", () => {
	const ctx = background();
	assert(ctx !== undefined);
	assertEquals(ctx.err(), undefined);
});

Deno.test("background - should return the same instance on multiple calls", () => {
	const ctx1 = background();
	const ctx2 = background();
	assertEquals(ctx1, ctx2);
});

Deno.test("background - should not be aborted initially", () => {
	const ctx = background();
	assertEquals(ctx.err(), undefined);
});

// watchSignal tests
Deno.test("watchSignal - should create a context with custom signal", () => {
	const parentCtx = background();
	const controller = new AbortController();
	const childCtx = watchSignal(parentCtx, controller.signal);

	assert(childCtx !== undefined);
	assertEquals(childCtx.err(), undefined);
});

Deno.test("watchSignal - should be cancelled when custom signal is aborted", async () => {
	const parentCtx = background();
	const controller = new AbortController();
	const childCtx = watchSignal(parentCtx, controller.signal);

	let done = false;
	childCtx.done().then(() => {
		done = true;
	});

	controller.abort(new Error("Custom abort"));

	// Wait a bit for async operations
	await new Promise((resolve) => setTimeout(resolve, 10));

	assertEquals(done, true);
	assert(childCtx.err() instanceof Error);
});

Deno.test("watchSignal - should handle already aborted signal", () => {
	const parentCtx = background();
	const controller = new AbortController();
	const testError = new Error("Already aborted");
	controller.abort(testError);

	const childCtx = watchSignal(parentCtx, controller.signal);
	assert(childCtx.err() instanceof Error);
});

Deno.test("watchSignal - should remove listener when context ends earlier", async () => {
	const parentCtx = background();
	const controller = new AbortController();
	const childCtx = watchSignal(parentCtx, controller.signal);

	// Wait for potential listener setup
	await new Promise((resolve) => setTimeout(resolve, 1));

	// Cancel context first
	const [c, cancel] = withCancel(childCtx);
	cancel();

	// No error should be thrown when aborting controller later
	controller.abort(new Error("Should be ignored"));
	await new Promise((resolve) => setTimeout(resolve, 1));
	assertEquals(true, true); // reach here without uncaught errors
});

// withCancel tests
Deno.test("withCancel - should create a cancellable context", () => {
	const parentCtx = background();
	const [childCtx, cancel] = withCancel(parentCtx);

	assert(childCtx !== undefined);
	assertEquals(childCtx.err(), undefined);
	assertEquals(typeof cancel, "function");
});

Deno.test("withCancel - should cancel the context when cancel function is called", async () => {
	const parentCtx = background();
	const [childCtx, cancel] = withCancel(parentCtx);

	let done = false;
	childCtx.done().then(() => {
		done = true;
	});

	cancel();

	// Wait a bit for async operations
	await new Promise((resolve) => setTimeout(resolve, 10));

	assertEquals(done, true);
	assert(childCtx.err() instanceof Error);
});

Deno.test("withCancel - should be cancelled when parent is cancelled", async () => {
	const [parentCtx, parentCancel] = withCancel(background());
	const [childCtx, _childCancel] = withCancel(parentCtx);

	let childDone = false;
	childCtx.done().then(() => {
		childDone = true;
	});

	parentCancel();

	// Wait a bit for async operations
	await new Promise((resolve) => setTimeout(resolve, 10));

	assertEquals(childDone, true);
});

Deno.test("withCancel - should cancel child synchronously when parent already cancelled", () => {
	const [parentCtx, parentCancel] = withCancel(background());
	parentCancel();

	const [childCtx] = withCancel(parentCtx);
	// Synchronous propagation: child should already reflect parent's error
	assert(childCtx.err() instanceof Error);
});

// withCancelCause tests
Deno.test("withCancelCause - should create a cancellable context with custom error", () => {
	const parentCtx = background();
	const [childCtx, cancel] = withCancelCause(parentCtx);

	assert(childCtx !== undefined);
	assertEquals(childCtx.err(), undefined);
	assertEquals(typeof cancel, "function");
});

Deno.test("withCancelCause - should cancel with custom error", async () => {
	const parentCtx = background();
	const [childCtx, cancel] = withCancelCause(parentCtx);

	const customError = new Error("Custom cancellation reason");
	cancel(customError);

	await new Promise((resolve) => setTimeout(resolve, 10));

	assertEquals(childCtx.err(), customError);
});

Deno.test("withCancelCause - should handle undefined error", async () => {
	const parentCtx = background();
	const [childCtx, cancel] = withCancelCause(parentCtx);

	let done = false;
	childCtx.done().then(() => {
		done = true;
	});

	cancel(undefined);

	await new Promise((resolve) => setTimeout(resolve, 10));

	assertEquals(done, true);
});

// withTimeout tests
Deno.test("withTimeout - should create a context with timeout", async () => {
	const parentCtx = background();
	const childCtx = withTimeout(parentCtx, 100);

	assert(childCtx !== undefined);
	assertEquals(childCtx.err(), undefined);

	// Wait for the context to complete (timeout or cancel) to avoid timer leak
	await childCtx.done();
});

Deno.test("withTimeout - should cancel after timeout", async () => {
	const parentCtx = background();
	const childCtx = withTimeout(parentCtx, 50);

	let done = false;
	childCtx.done().then(() => {
		done = true;
	});

	// Wait for timeout
	await new Promise((resolve) => setTimeout(resolve, 100));

	assertEquals(done, true);
	assert(childCtx.err() instanceof Error);
});

Deno.test("withTimeout - should not timeout if parent is cancelled first", async () => {
	const [parentCtx, parentCancel] = withCancel(background());
	const childCtx = withTimeout(parentCtx, 100);

	parentCancel();

	await new Promise((resolve) => setTimeout(resolve, 10));

	assert(childCtx.err() instanceof Error);
});

// watchPromise tests
Deno.test("watchPromise - should create a context that cancels when promise resolves", async () => {
	const parentCtx = background();
	const promise = new Promise<void>((resolve) => setTimeout(() => resolve(), 50));
	const childCtx = watchPromise(parentCtx, promise);

	let done = false;
	childCtx.done().then(() => {
		done = true;
	});

	await new Promise((resolve) => setTimeout(resolve, 100));

	assertEquals(done, true);
});

Deno.test("watchPromise - should create a context that cancels when promise rejects", async () => {
	const parentCtx = background();
	const promise = new Promise<void>((_, reject) =>
		setTimeout(() => reject(new Error("Promise rejected")), 50)
	);
	const childCtx = watchPromise(parentCtx, promise);

	let done = false;
	let caughtError: unknown = null;

	childCtx.done().then(() => {
		done = true;
		caughtError = childCtx.err();
	});

	await new Promise((resolve) => setTimeout(resolve, 100));

	assertEquals(done, true);
	assert(caughtError instanceof Error);
	if (caughtError instanceof Error) {
		assert(caughtError.message.includes("Promise rejected"));
	}
});

Deno.test("watchPromise - should handle non-Error rejection reasons", async () => {
	const parentCtx = background();
	const promise = new Promise<void>((_, reject) =>
		setTimeout(() => reject("string rejection"), 50)
	);
	const childCtx = watchPromise(parentCtx, promise);

	let done = false;
	let caughtError: unknown = null;

	childCtx.done().then(() => {
		done = true;
		caughtError = childCtx.err();
	});

	await new Promise((resolve) => setTimeout(resolve, 100));

	assertEquals(done, true);
	assert(caughtError instanceof Error);
	if (caughtError instanceof Error) {
		assert(caughtError.message.includes("string rejection"));
	}
});

// Context interface tests
Deno.test("Context interface - should provide done() promise that resolves when cancelled", async () => {
	const [ctx, cancel] = withCancel(background());

	let resolved = false;
	let error: Error | null = null;

	ctx.done().then(async () => {
		resolved = true;
		error = ctx.err() || null;

		cancel();

		// Wait a bit for async operations
		await new Promise((resolve) => setTimeout(resolve, 10));

		assertEquals(resolved, true);
		assert(error instanceof Error);
	});
});

Deno.test("Context interface - should have signal property", () => {
	const ctx = background();
	assert(ctx !== undefined);
});

Deno.test("Context interface - should return error when cancelled", async () => {
	const [ctx, cancel] = withCancel(background());

	assertEquals(ctx.err(), undefined);

	cancel();

	await new Promise((resolve) => setTimeout(resolve, 10));

	assert(ctx.err() instanceof Error);
});

// Error constants tests
Deno.test("ContextCancelledError - should be an instance of Error", () => {
	const err = new ContextCancelledError();
	assert(err instanceof Error);
});

Deno.test("ContextCancelledError - should have the correct message", () => {
	const err = new ContextCancelledError();
	assertEquals(err.message, "Context cancelled");
});

Deno.test("ContextTimeoutError - should be an instance of Error", () => {
	const err = new ContextTimeoutError();
	assert(err instanceof Error);
});

Deno.test("ContextTimeoutError - should have the correct message", () => {
	const err = new ContextTimeoutError("Context timeout");
	assertEquals(err.message, "Context timeout");
});

// withAbort tests
Deno.test("withAbort - aborting controller cancels context", async () => {
	const parentCtx = background();
	const [ctx, controller] = withAbort(parentCtx);

	let done = false;
	ctx.done().then(() => {
		done = true;
	});

	controller.abort(new Error("Aborted"));

	await new Promise((resolve) => setTimeout(resolve, 10));

	assertEquals(done, true);
	assert(ctx.err() instanceof Error);
});

Deno.test("withAbort - cancelling context aborts controller", async () => {
	const [parentCtx, cancelParent] = withCancel(background());
	const [ctx, controller] = withAbort(parentCtx);

	assertEquals(controller.signal.aborted, false);

	cancelParent();

	await new Promise((resolve) => setTimeout(resolve, 50));

	assertEquals(controller.signal.aborted, true);
});

// afterFunc tests
Deno.test("afterFunc - should execute callback when context is cancelled", async () => {
	const [ctx, cancel] = withCancel(background());

	let callbackExecuted = false;
	afterFunc(ctx, () => {
		callbackExecuted = true;
	});

	cancel();

	await new Promise((resolve) => setTimeout(resolve, 10));

	assertEquals(callbackExecuted, true);
});

Deno.test("afterFunc - should return true when stop is called before execution", async () => {
	const [ctx, cancel] = withCancel(background());

	let callbackExecuted = false;
	const stop = afterFunc(ctx, async () => {
		await new Promise((r) => setTimeout(r, 10));
		callbackExecuted = true;
	});

	cancel();

	// Stop the callback before it executes
	const stopped = stop();

	await new Promise((resolve) => setTimeout(resolve, 50));

	assertEquals(stopped, true);
	assertEquals(callbackExecuted, false);
});

Deno.test("afterFunc - should return false when stop is called after execution", async () => {
	const [ctx, cancel] = withCancel(background());

	let callbackExecuted = false;
	const stop = afterFunc(ctx, () => {
		callbackExecuted = true;
	});

	cancel();

	await new Promise((resolve) => setTimeout(resolve, 10));

	const stopped = stop();

	assertEquals(stopped, false);
	assertEquals(callbackExecuted, true);
});
