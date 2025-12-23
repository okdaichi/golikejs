/**
 * Once is an object that will perform exactly one action.
 *
 * A Once must not be copied after first use.
 *
 * @example
 * ```ts
 * import { Once } from "@okdaichi/golikejs/sync";
 *
 * const once = new Once();
 * const init = async () => {
 *   console.log("initialized");
 *   return 42;
 * };
 *
 * // Even if called concurrently, init runs only once
 * await Promise.all([
 *   once.do(init),
 *   once.do(init),
 *   once.do(init),
 * ]); // logs "initialized" only once
 * ```
 *
 * Note: Calling `do` from within the function passed to `do` will result in
 * a deadlock-like situation where the inner call never completes.
 */
export class Once {
	#state: 0 | 1 | 2 = 0; // 0: not started, 1: running, 2: done
	#promise?: Promise<unknown>;

	/**
	 * Calls the function f if and only if do is being called for the
	 * first time for this instance of Once. In other words, given
	 * ```ts
	 * const once = new Once();
	 * ```
	 * if `once.do(f)` is called multiple times, only the first call will
	 * execute f, even if f has a different value in each invocation.
	 * A new instance of Once is required for each function to execute.
	 *
	 * do is intended for initialization that must be run exactly once.
	 * Because f is async and has no return value requirements, it may be
	 * necessary to use a separate mechanism to report completion to other
	 * operations, such as channels or condition variables.
	 *
	 * If f throws an error, do considers it to have completed; future calls
	 * of do return without calling f.
	 *
	 * @param f - The async function to execute once
	 * @returns A promise that resolves with the result of f, or rejects with its error
	 */
	async do<T>(f: () => T | Promise<T>): Promise<T> {
		// Fast path: already done
		if (this.#state === 2) {
			return this.#promise as Promise<T>;
		}

		// Slow path: need to start or wait
		if (this.#state === 0) {
			this.#state = 1;
			this.#promise = (async () => {
				try {
					return await f();
				} finally {
					// Mark as done even if f threw an error
					// This matches Go's sync.Once behavior
					this.#state = 2;
				}
			})();
		}

		// Either we just started it, or another caller started it
		return this.#promise as Promise<T>;
	}
}
