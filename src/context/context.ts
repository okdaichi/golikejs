/**
 * Context carries cancellation signals and deadlines across API boundaries.
 * Similar to Go's context.Context, it enables propagating cancellation and timeouts
 * through asynchronous operation chains.
 *
 * @example
 * ```ts
 * import { context } from "@okudai/golikejs";
 *
 * const [ctx, cancel] = context.withCancel(context.background());
 * try {
 *   await doWork(ctx);
 * } finally {
 *   cancel();
 * }
 * ```
 */
export interface Context {
	/**
	 * Returns a promise that resolves when the context is finished (cancelled, timed out, etc).
	 * Never rejects.
	 */
	done(): Promise<void>;
	/**
	 * The cancellation error if the context is finished. `undefined` means: not cancelled / finished without error.
	 */
	err(): Error | undefined;
}

/**
 * CancelFunc is a function that cancels a Context.
 * Calling a CancelFunc cancels the associated context and all derived contexts.
 */
export type CancelFunc = () => void;

/**
 * CancelCauseFunc is a function that cancels a Context with a specific error.
 * Allows providing a custom error or undefined to indicate clean completion.
 */
export type CancelCauseFunc = (err: Error | undefined) => void;

/**
 * ContextCancelledError indicates that a Context was explicitly cancelled.
 */
export class ContextCancelledError extends Error {
	/**
	 * Creates a new ContextCancelledError.
	 *
	 * @param message - The error message, defaults to "Context cancelled"
	 */
	constructor(message = "Context cancelled") {
		super(message);
		this.name = "ContextCancelledError";
		Object.setPrototypeOf(this, ContextCancelledError.prototype);
	}
}

/**
 * ContextTimeoutError indicates that a Context exceeded its deadline or timeout.
 */
export class ContextTimeoutError extends Error {
	/**
	 * Creates a new ContextTimeoutError.
	 *
	 * @param message - The error message, defaults to "context deadline exceeded"
	 */
	constructor(message = "context deadline exceeded") {
		super(message);
		this.name = "ContextTimeoutError";
		Object.setPrototypeOf(this, ContextTimeoutError.prototype);
	}
}

class DefaultContext implements Context {
	// Lazily-created done promise and its resolver. If never awaited, we avoid
	// allocating the Promise to reduce memory pressure for short-lived contexts.
	#donePromise?: Promise<void>;
	#resolve?: () => void;
	#err?: Error; // undefined => either not done yet OR completed cleanly

	constructor(parent?: Context) {
		if (parent) {
			// If parent already has an error (cancelled or errored), propagate
			// synchronously to avoid surprising microtask scheduling delays.
			// Note: `parent.err()` being `undefined` is ambiguous (not done OR
			// finished without error), so we only synchronous-propagate when
			// the parent has a concrete error value.
			const parentErr = parent.err();
			if (parentErr !== undefined) {
				this.cancel(parentErr);
				return; // already finished (cancelled/errored) - nothing else to do
			}

			// Propagate parent cancellation asynchronously for later cancellation
			// and for the case where the parent finishes without error.
			parent.done().then(() => {
				this.cancel(parent.err()); // cancel is idempotent
			});
		}
	}

	done(): Promise<void> {
		// If already created, return it.
		if (this.#donePromise) return this.#donePromise;

		// If already finished (cancelled or completed), return resolved promise.
		if (this.#err !== undefined) {
			this.#donePromise = Promise.resolve();
			this.#resolve = () => {};
			return this.#donePromise;
		}

		// Otherwise create the promise and capture the resolver lazily.
		this.#donePromise = new Promise((resolve) => {
			this.#resolve = resolve;
		});
		return this.#donePromise;
	}

	err(): Error | undefined {
		return this.#err;
	}

	// If called with no arguments, treat as cancellation with default error.
	// If called with an explicit `undefined`, treat as finished without error.
	cancel(err?: Error): void {
		if (this.#err !== undefined) return; // idempotent

		if (arguments.length === 0) {
			// No argument passed -> default cancellation error
			this.#err = new ContextCancelledError();
		} else {
			// Explicit argument passed (possibly undefined) -> set as-is
			this.#err = err;
		}

		if (this.#resolve) {
			// If someone is waiting, resolve the promise.
			this.#resolve();
		} else {
			// If nobody has awaited yet, create an already-resolved promise so
			// future calls to done() return a resolved promise.
			this.#donePromise = Promise.resolve();
			this.#resolve = () => {};
		}
	}
}

const backgroundContext: Context = (() => {
	const context = new DefaultContext();
	// Guard for SSR / non-browser environments
	if (typeof window !== "undefined" && typeof globalThis.addEventListener === "function") {
		const handlePageTermination = (eventType: string) => {
			context.cancel(new Error(`Page ${eventType}`));
		};
		const once = { once: true } as const;
		globalThis.addEventListener("beforeunload", () => handlePageTermination("unloading"), once);
		globalThis.addEventListener("unload", () => handlePageTermination("unloaded"), once);
		globalThis.addEventListener("pagehide", () => handlePageTermination("hidden"), once);
	}
	return context;
})();

// Public API functions

/**
 * Returns a background Context that is never cancelled.
 * Similar to Go's context.Background(), this is typically used as the root context.
 *
 * @returns A background Context
 */
export function background(): Context {
	return backgroundContext;
}

/**
 * Creates a Context that cancels when the provided AbortSignal aborts.
 * Useful for integrating with fetch and other Web APIs that use AbortSignal.
 *
 * @param parent - The parent Context
 * @param signal - The AbortSignal to watch
 * @returns A new Context that cancels when the signal aborts
 *
 * @example
 * ```ts
 * import { context } from "@okudai/golikejs";
 *
 * const ac = new AbortController();
 * const ctx = context.watchSignal(context.background(), ac.signal);
 * ac.abort(); // cancels ctx
 * ```
 */
export function watchSignal(parent: Context, signal: AbortSignal): Context {
	const context = new DefaultContext(parent);

	const onAbort = () => {
		context.cancel(
			(signal as any).reason instanceof Error
				? (signal as any).reason as Error
				: new ContextCancelledError(),
		);
	};

	if (signal.aborted) {
		onAbort();
	} else {
		signal.addEventListener("abort", onAbort, { once: true });
		// Ensure listener removal when context ends earlier
		context.done().finally(() => signal.removeEventListener("abort", onAbort));
	}
	return context;
}

// (No backwards-compatible aliases — package is not yet published.)

/**
 * Creates a Context with an AbortController that are synchronized.
 * Aborting the controller cancels the Context, and vice versa.
 * Similar to Go's context.WithCancel, returns both the Context and a cancel mechanism.
 *
 * @param parent - The parent Context
 * @returns A tuple of [Context, AbortController]
 *
 * @example
 * ```ts
 * import { context } from "@okudai/golikejs";
 *
 * const [ctx, ac] = context.withAbort(context.background());
 * ac.abort(); // cancels ctx
 * ```
 */
export function withAbort(parent: Context): [Context, AbortController] {
	const context = new DefaultContext(parent);
	const ac = new AbortController();

	const onAbort = () => {
		context.cancel(
			(ac.signal as any).reason instanceof Error
				? (ac.signal as any).reason as Error
				: new ContextCancelledError(),
		);
	};

	if (ac.signal.aborted) {
		onAbort();
	} else {
		ac.signal.addEventListener("abort", onAbort, { once: true });
		context.done().finally(() => ac.signal.removeEventListener("abort", onAbort));
	}

	// Ensure context cancellation aborts the controller (two-way sync)
	context.done().then(() => {
		const err = context.err();
		try {
			// Modern AbortController supports a reason argument; try to pass the error.
			(ac as any).abort(err);
		} catch {
			ac.abort();
		}
	});

	return [context, ac];
}

/**
 * Creates a cancellable Context derived from parent.
 * Similar to Go's context.WithCancel.
 *
 * @param parent - The parent Context
 * @returns A tuple of [Context, CancelFunc]
 *
 * @example
 * ```ts
 * import { context } from "@okudai/golikejs";
 *
 * const [ctx, cancel] = context.withCancel(context.background());
 * // ... do work
 * cancel(); // cancels ctx
 * ```
 */
export function withCancel(parent: Context): [Context, CancelFunc] {
	const context = new DefaultContext(parent);
	return [context, () => context.cancel(new ContextCancelledError())];
}

/**
 * Creates a cancellable Context with a cancel function that accepts a custom error.
 * Similar to Go's context.WithCancelCause.
 *
 * @param parent - The parent Context
 * @returns A tuple of [Context, CancelCauseFunc]
 */
export function withCancelCause(parent: Context): [Context, CancelCauseFunc] {
	const context = new DefaultContext(parent);
	return [context, (err: Error | undefined) => context.cancel(err)];
}

/**
 * Creates a Context that automatically cancels after the specified timeout.
 * Similar to Go's context.WithTimeout.
 *
 * @param parent - The parent Context
 * @param timeoutMs - The timeout in milliseconds
 * @returns A new Context that cancels after the timeout
 *
 * @example
 * ```ts
 * import { context } from "@okudai/golikejs";
 *
 * const ctx = context.withTimeout(context.background(), 5000);
 * await ctx.done(); // resolves after 5 seconds
 * ```
 */
export function withTimeout(parent: Context, timeoutMs: number): Context {
	const context = new DefaultContext(parent);
	const id = setTimeout(() => {
		context.cancel(new ContextTimeoutError());
	}, timeoutMs);
	context.done().finally(() => clearTimeout(id));
	return context;
}

/**
 * Creates a Context that completes when the provided Promise settles.
 * Resolves with undefined on success, or with the rejection error on failure.
 *
 * @template T - The Promise result type
 * @param parent - The parent Context
 * @param promise - The Promise to watch
 * @returns A new Context that completes with the Promise
 */
export function watchPromise<T>(parent: Context, promise: Promise<T>): Context {
	const context = new DefaultContext(parent);
	promise.then(
		() => context.cancel(undefined), // normal completion: finished without an error
		(reason) => {
			const error = reason instanceof Error ? reason : new Error(String(reason));
			context.cancel(error);
		},
	);
	return context;
}

/**
 * AfterFuncContext is an internal Context that executes a function when its parent is cancelled.
 * @internal
 */
class AfterFuncContext extends DefaultContext {
	#fn?: () => void | Promise<void>;
	#executed = false;

	constructor(parent: Context, fn: () => void | Promise<void>) {
		super(parent);
		this.#fn = fn;

		// When the parent context finishes, execute the function
		parent.done().then(() => {
			this.#executeFunc();
		});
	}

	#executeFunc(): void {
		if (this.#executed || this.#fn === undefined) {
			return;
		}
		this.#executed = true;
		const fn = this.#fn;
		this.#fn = undefined;

		// Execute the function without awaiting (fire-and-forget)
		// to match Go's behavior of running in a separate goroutine
		const result = fn();
		if (result instanceof Promise) {
			result.catch(() => {
				// Silently ignore errors during execution
			});
		}
	}

	stop(): boolean {
		if (this.#executed || this.#fn === undefined) {
			return false;
		}
		this.#executed = true;
		this.#fn = undefined;
		return true;
	}
}

/**
 * Registers a function to execute when the parent Context is cancelled.
 * Returns a stop function that can prevent the function from executing if called before cancellation.
 * Similar to Go's context.AfterFunc.
 *
 * @param parent - The parent Context
 * @param fn - The function to execute on cancellation
 * @returns A stop function that returns true if it prevented execution, false otherwise
 *
 * @example
 * ```ts
 * import { context } from "@okudai/golikejs";
 *
 * const [ctx, cancel] = context.withCancel(context.background());
 * const stop = context.afterFunc(ctx, () => console.log("cancelled"));
 * cancel(); // prints "cancelled"
 * ```
 */
export function afterFunc(parent: Context, fn: () => void | Promise<void>): () => boolean {
	const ctx = new AfterFuncContext(parent, fn);

	return () => ctx.stop();
}

/**
 * Converts a Context into an AbortSignal for integration with fetch and other Web APIs.
 * The returned signal will abort when the Context is cancelled.
 *
 * @param ctx - The Context to convert
 * @returns An AbortSignal that aborts when the Context is cancelled
 *
 * @example
 * ```ts
 * import { context } from "@okudai/golikejs";
 *
 * const [ctx, cancel] = context.withCancel(context.background());
 * const signal = context.toAbortSignal(ctx);
 * fetch("/api/data", { signal });
 * ```
 */
export function toAbortSignal(ctx: Context): AbortSignal {
	const ac = new AbortController();
	ctx.done().then(() => {
		const err = ctx.err();
		if (err) {
			// AbortController#abort can take a reason in modern browsers
			try {
				(ac as any).abort(err);
			} catch {
				ac.abort();
			}
		} else {
			ac.abort();
		}
	});
	return ac.signal;
}
