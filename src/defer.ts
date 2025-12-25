/**
 * DeferredSyncFunc represents a synchronous function that can be deferred.
 * Functions of this type will be executed in LIFO order when the enclosing scope exits.
 */
export type DeferredSyncFunc = () => void;

/**
 * DeferredAsyncFunc represents an asynchronous function that can be deferred.
 * Functions of this type will be executed in LIFO order when the enclosing scope exits.
 */
export type DeferredAsyncFunc = () => Promise<void>;

/**
 * DeferFunc is a function that registers cleanup handlers to be called on scope exit.
 * Similar to Go's defer statement, deferred functions execute in LIFO order.
 *
 * @param fn - The synchronous or asynchronous function to defer
 */
export type DeferFunc = (fn: DeferredSyncFunc | DeferredAsyncFunc) => void;

/**
 * Executes a function with defer support, running all deferred functions on exit.
 * Similar to Go's defer statement, cleanup functions are executed in LIFO order
 * regardless of whether the main function completes normally or throws an error.
 *
 * @param fn - The function to execute with defer support. Receives a defer function to register cleanup handlers.
 * @returns A promise that resolves when the function and all deferred cleanup complete.
 *
 * @example
 * ```ts
 * import { scope } from "@okudai/golikejs";
 *
 * await scope(async (defer) => {
 *   const file = await openFile("data.txt");
 *   defer(() => file.close());
 *
 *   // Work with file - close() will be called automatically
 *   const data = await file.read();
 * });
 * ```
 */
export async function scope(fn: (defer: DeferFunc) => void | Promise<void>): Promise<void> {
	const task: (DeferredSyncFunc | DeferredAsyncFunc)[] = [];

	const defer: DeferFunc = (fn) => {
		task.push(fn);
	};

	try {
		await fn(defer);
	} finally {
		while (task.length > 0) {
			const fn = task.pop();
			if (!fn) continue;
			try {
				await fn();
			} catch (e) {
				console.error(e);
			}
		}
	}
}
