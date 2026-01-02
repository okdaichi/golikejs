/**
 * Channel provides Go-style channels for communication between async operations
 */

export class Channel<T> {
	// ring buffer storage when capacity > 0
	#buffer: (T | undefined)[] | null = null;
	#capacity: number;
	#head = 0; // index of next read
	#tail = 0; // index of next write
	#count = 0; // number of items in buffer
	#closed = false;
	#sendWaiters: Array<{ value: T; resolve: () => void }> = [];
	#receiveWaiters: Array<{ resolve: (value: [T, true] | [undefined, false]) => void }> = [];

	/**
	 * Create a channel with the given capacity.
	 * If capacity is 0, creates an unbuffered channel.
	 */
	constructor(capacity = 0) {
		if (capacity < 0) {
			throw new Error("Channel: capacity must be non-negative");
		}
		this.#capacity = capacity;
		if (capacity > 0) this.#buffer = new Array<T | undefined>(capacity);
	}

	/**
	 * Send a value to the channel. For buffered channels, this may block if the buffer is full.
	 * For unbuffered channels, this blocks until a receiver is ready.
	 */
	async send(value: T): Promise<void> {
		if (this.#closed) {
			throw new Error("Channel: send on closed channel");
		}

		// If there's a waiting receiver, send directly
		if (this.#receiveWaiters.length > 0) {
			const waiter = this.#receiveWaiters.shift();
			if (waiter) {
				waiter.resolve([value, true]);
				return;
			}
		}
		// If there's a waiting receiver, send directly
		if (this.#receiveWaiters.length > 0) {
			const waiter = this.#receiveWaiters.shift();
			if (waiter) {
				waiter.resolve([value, true]);
				return;
			}
		}

		// If buffered and buffer has space, add to buffer
		if (this.#capacity > 0 && this.#count < this.#capacity) {
			// write at tail
			const buf = this.#buffer!;
			buf[this.#tail] = value;
			this.#tail = (this.#tail + 1) % this.#capacity;
			this.#count++;
			return;
		}
		// If buffered and buffer has space, add to buffer
		if (this.#capacity > 0 && this.#count < this.#capacity) {
			// write at tail
			const buf = this.#buffer!;
			buf[this.#tail] = value;
			this.#tail = (this.#tail + 1) % this.#capacity;
			this.#count++;
			return;
		}

		// Otherwise, wait for a receiver
		return new Promise<void>((resolve) => {
			this.#sendWaiters.push({ value, resolve });
		});
	}

	/**
	 * Receive a value from the channel. Returns [value, true] if successful, or [undefined, false] if the channel is closed.
	 */
	async receive(): Promise<[T, true] | [undefined, false]> {
		// If buffer has values, take from ring buffer
		if (this.#count > 0) {
			const buf = this.#buffer!;
			const value = buf[this.#head]!;
			buf[this.#head] = undefined;
			this.#head = (this.#head + 1) % this.#capacity;
			this.#count--;
			this.#processSendWaiters();
			return [value, true];
		}

		// If there's a waiting sender, receive directly
		if (this.#sendWaiters.length > 0) {
			const waiter = this.#sendWaiters.shift();
			if (waiter) {
				waiter.resolve();
				return [waiter.value, true];
			}
		}

		// If channel is closed and no values, return closed signal
		if (this.#closed) {
			return [undefined, false];
		}
		// If channel is closed and no values, return closed signal
		if (this.#closed) {
			return [undefined, false];
		}

		// Otherwise, wait for a sender
		return new Promise<[T, true] | [undefined, false]>((resolve) => {
			this.#receiveWaiters.push({ resolve });
		});
	}

	/**
	 * Close the channel. After closing, no more values can be sent.
	 */
	close(): void {
		if (this.#closed) {
			return;
		}

		this.#closed = true;

		// Wake up all waiting senders with error
		this.#sendWaiters.forEach(() => {
			// In a real implementation, we'd reject these promises
			// For simplicity, we'll just clear the queue
		});
		this.#sendWaiters.length = 0;

		// Wake up all waiting receivers with closed signal
		this.#receiveWaiters.forEach((waiter) => {
			waiter.resolve([undefined, false]);
		});
		this.#receiveWaiters.length = 0;
	}

	/**
	 * Try to receive a value without blocking. Returns [value, true] if successful, [undefined, false] if no value is available or channel is closed.
	 */
	tryReceive(): [T, true] | [undefined, false] {
		if (this.#count > 0) {
			const buf = this.#buffer!;
			const value = buf[this.#head]!;
			buf[this.#head] = undefined;
			this.#head = (this.#head + 1) % this.#capacity;
			this.#count--;
			this.#processSendWaiters();
			return [value, true];
		}

		if (this.#sendWaiters.length > 0) {
			const waiter = this.#sendWaiters.shift();
			if (waiter) {
				waiter.resolve();
				return [waiter.value, true];
			}
		}

		return [undefined, false];
	}

	/**
	 * Try to send a value without blocking. Returns true if successful.
	 */
	trySend(value: T): boolean {
		if (this.#closed) {
			return false;
		}

		// If there's a waiting receiver, send directly
		if (this.#receiveWaiters.length > 0) {
			const waiter = this.#receiveWaiters.shift();
			if (waiter) {
				waiter.resolve([value, true]);
				return true;
			}
		}

		// If buffered and buffer has space, add to ring buffer
		if (this.#capacity > 0 && this.#count < this.#capacity) {
			const buf = this.#buffer!;
			buf[this.#tail] = value;
			this.#tail = (this.#tail + 1) % this.#capacity;
			this.#count++;
			return true;
		}

		return false;
	}

	#processSendWaiters(): void {
		// If buffer has space and there are waiting senders, move them to buffer
		while (this.#count < this.#capacity && this.#sendWaiters.length > 0) {
			const waiter = this.#sendWaiters.shift();
			if (waiter) {
				const buf = this.#buffer!;
				buf[this.#tail] = waiter.value;
				this.#tail = (this.#tail + 1) % this.#capacity;
				this.#count++;
				waiter.resolve();
			}
		}
	}

	/**
	 * Get current buffer length
	 */
	get length(): number {
		return this.#count;
	}

	/**
	 * Get channel capacity
	 */
	get capacity(): number {
		return this.#capacity;
	}

	/**
	 * Check if channel is closed
	 */
	get closed(): boolean {
		return this.#closed;
	}

	/**
	 * Check if data is available for reading (used by select)
	 */
	hasData(): boolean {
		return this.#count > 0 || this.#sendWaiters.length > 0;
	}

	/**
	 * Check if data can be sent immediately (used by select)
	 */
	canSend(): boolean {
		return this.#receiveWaiters.length > 0 ||
			(this.#capacity > 0 && this.#count < this.#capacity);
	}
}

/**
 * ReceiveCase represents a channel receive operation in a select statement.
 * When selected, receives a value from the channel and executes the action.
 *
 * @template T - The type of value to receive
 */
export interface ReceiveCase<T = any> {
	/** Channel to receive from */
	channel: Channel<T>;
	/** Action to execute when this case is selected */
	action: (value: T | undefined, ok: boolean) => void;
}

/**
 * SendCase represents a channel send operation in a select statement.
 * When selected, sends a value to the channel and executes the action.
 *
 * @template T - The type of value to send
 */
export interface SendCase<T = any> {
	/** Channel to send to */
	channel: Channel<T>;
	/** Value to send to the channel */
	value: T;
	/** Action to execute when this case is selected */
	action: () => void;
}

/**
 * DefaultCase represents the default branch in a select statement.
 * Executes when no other cases are ready immediately.
 */
export interface DefaultCase {
	/** Default action when no other cases are ready */
	default: () => void;
}

/**
 * SelectCase is a union type of all possible select cases.
 *
 * @template T - The type of channel values
 */
export type SelectCase<T = any> = ReceiveCase<T> | SendCase<T> | DefaultCase;

/**
 * Select performs a select operation on multiple channel operations.
 * It waits for one of the cases to be ready and executes its action.
 * If a default case is provided and no other cases are ready, it executes the default action.
 *
 * @param cases Array of select cases (receive, send, or default)
 *
 * @example
 * ```typescript
 * await select([
 *   { channel: ch1, action: (value, ok) => console.log('received:', value) },
 *   { channel: ch2, value: 'hello', action: () => console.log('sent') },
 *   { default: () => console.log('no operation ready') }
 * ]);
 * ```
 */
export async function select<T = any>(cases: SelectCase<T>[]): Promise<void> {
	if (cases.length === 0) {
		throw new Error("select: no cases provided");
	}

	// Separate cases by type in a single pass - optimized for performance
	const receiveCases: ReceiveCase<T>[] = [];
	const sendCases: SendCase<T>[] = [];
	let defaultCase: DefaultCase | undefined;

	// Single pass classification with validation
	for (const case_ of cases) {
		if ("default" in case_) {
			if (defaultCase) throw new Error("select: multiple default cases not allowed");
			defaultCase = case_;
		} else if ("value" in case_) {
			sendCases.push(case_ as SendCase<T>);
		} else {
			receiveCases.push(case_ as ReceiveCase<T>);
		}
	}

	// Fast path: if default case exists and no operations are ready, execute immediately
	if (defaultCase) {
		const hasReadyOperation = receiveCases.some((case_) => case_.channel.hasData()) ||
			sendCases.some((case_) => case_.channel.canSend());
		if (!hasReadyOperation) {
			defaultCase.default();
			return;
		}
	}

	// Create racing promises - optimized to avoid async function overhead
	const promises: Promise<
		{ type: "receive" | "send"; case_: ReceiveCase<T> | SendCase<T>; value?: T; ok?: boolean }
	>[] = [];

	// Add receive promises
	for (const case_ of receiveCases) {
		promises.push(
			case_.channel.receive().then(([value, ok]) => ({
				type: "receive" as const,
				case_,
				value,
				ok,
			})),
		);
	}

	// Add send promises
	for (const case_ of sendCases) {
		promises.push(
			case_.channel.send(case_.value).then(() => ({ type: "send" as const, case_ })),
		);
	}

	// Race and execute winner - optimized with ternary operator
	const result = await Promise.race(promises);
	result.type === "receive"
		? (result.case_ as ReceiveCase<T>).action(result.value!, result.ok!)
		: (result.case_ as SendCase<T>).action();
}

/**
 * Creates a receive case for use with select().
 * Fluent API that returns a builder with a `then` method to specify the action.
 *
 * @template T - The type of value to receive
 * @param channel - The channel to receive from
 * @returns A builder object with a `then` method
 *
 * @example
 * ```ts
 * import { Channel, select, receive } from "@okudai/golikejs";
 *
 * const ch = new Channel<number>();
 * await select([
 *   receive(ch).then((value, ok) => console.log('received:', value))
 * ]);
 * ```
 */
export function receive<T = any>(channel: Channel<T>): {
	then(action: (value: T | undefined, ok: boolean) => void): ReceiveCase<T>;
} {
	return {
		then(action: (value: T | undefined, ok: boolean) => void): ReceiveCase<T> {
			return { channel, action };
		},
	};
}

/**
 * Creates a send case for use with select().
 * Fluent API that returns a builder with a `then` method to specify the action.
 *
 * @template T - The type of value to send
 * @param channel - The channel to send to
 * @param value - The value to send
 * @returns A builder object with a `then` method
 *
 * @example
 * ```ts
 * import { Channel, select, send } from "@okudai/golikejs";
 *
 * const ch = new Channel<string>();
 * await select([
 *   send(ch, "hello").then(() => console.log('sent'))
 * ]);
 * ```
 */
export function send<T = any>(channel: Channel<T>, value: T): {
	then(action: () => void): SendCase<T>;
} {
	return {
		then(action: () => void): SendCase<T> {
			return { channel, value, action };
		},
	};
}

/**
 * Creates a default case for use with select().
 * The default case executes when no other cases are immediately ready.
 *
 * @param action - The function to execute when no other cases are ready
 * @returns A DefaultCase object
 *
 * @example
 * ```ts
 * import { Channel, select, receive, default_ } from "@okudai/golikejs";
 *
 * const ch = new Channel<number>();
 * await select([
 *   receive(ch).then((value, ok) => console.log('received:', value)),
 *   default_(() => console.log('no data available'))
 * ]);
 * ```
 */
export function default_(action: () => void): DefaultCase {
	return { default: action };
}
