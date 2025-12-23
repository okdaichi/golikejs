import { assert, assertEquals } from "@std/assert";
import {
	afterFunc,
	background,
	ContextCancelledError,
	ContextTimeoutError,
	toAbortSignal,
	watchPromise,
	watchSignal,
	withAbort,
	withCancel,
	withCancelCause,
	withTimeout,
} from "./mod.ts";

// The tests below validate that the re-exports from `context package` behave the same as
// those exported directly from `context.ts` (sanity checks).

Deno.test("context package - background exposed and working", () => {
	const ctx = background();
	assert(ctx !== undefined);
	assertEquals(ctx.err(), undefined);
});

Deno.test("context package - withCancel creates cancellable context", async () => {
	const parent = background();
	const [ctx, cancel] = withCancel(parent);
	let done = false;
	ctx.done().then(() => (done = true));
	cancel();
	await new Promise((r) => setTimeout(r, 10));
	assertEquals(done, true);
});

Deno.test("context package - withTimeout cancels after timeout", async () => {
	const ctx = withTimeout(background(), 10);
	let done = false;
	ctx.done().then(() => (done = true));
	await new Promise((r) => setTimeout(r, 25));
	assertEquals(done, true);
	assert(ctx.err() instanceof Error);
});

Deno.test("context package - watchPromise cancels when promise resolves", async () => {
	const promise = new Promise<void>((resolve) => setTimeout(resolve, 20));
	const ctx = watchPromise(background(), promise);
	let done = false;
	ctx.done().then(() => (done = true));
	await new Promise((r) => setTimeout(r, 40));
	assertEquals(done, true);
});

Deno.test("context package - watchSignal cancels when signal aborted", async () => {
	const controller = new AbortController();
	const ctx = watchSignal(background(), controller.signal);
	let done = false;
	ctx.done().then(() => (done = true));
	controller.abort(new Error("abort"));
	await new Promise((r) => setTimeout(r, 10));
	assertEquals(done, true);
});

Deno.test("context package - withAbort abort/abort-controller synchronization", async () => {
	const [ctx, ac] = withAbort(background());
	let done = false;
	ctx.done().then(() => (done = true));
	ac.abort(new Error("abort"));
	await new Promise((r) => setTimeout(r, 10));
	assertEquals(done, true);
});

Deno.test("context package - toAbortSignal returns AbortSignal that aborts when ctx done", async () => {
	const [ctx, cancel] = withCancel(background());
	const signal = toAbortSignal(ctx);
	let aborted = false;
	signal.addEventListener("abort", () => (aborted = true), { once: true });
	cancel();
	await new Promise((r) => setTimeout(r, 10));
	assertEquals(aborted, true);
});

Deno.test("context package - afterFunc executes callback on cancel", async () => {
	const [ctx, cancel] = withCancel(background());
	let ran = false;
	afterFunc(ctx, () => {
		ran = true;
	});
	cancel();
	await new Promise((r) => setTimeout(r, 10));
	assertEquals(ran, true);
});

Deno.test("context package - withCancelCause propagates custom cancellation error", async () => {
	const [ctx, cancel] = withCancelCause(background());
	const customErr = new Error("custom cause");

	let done = false;
	ctx.done().then(() => (done = true));
	cancel(customErr);
	await new Promise((r) => setTimeout(r, 10));
	assertEquals(done, true);
	assertEquals(ctx.err(), customErr);
});

Deno.test("context package - ContextCancelledError and ContextTimeoutError exported", () => {
	const ce = new ContextCancelledError();
	assert(ce instanceof Error);
	assertEquals(ce.message, "Context cancelled");

	const te = new ContextTimeoutError("timeout occurred");
	assert(te instanceof Error);
	assertEquals(te.message, "timeout occurred");
});
