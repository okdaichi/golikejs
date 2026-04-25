/**
 * Channel provides Go-style channels for communication between async operations.
 * It supports both unbuffered and buffered channels.
 *
 * @example
 * ```ts
 * const ch = new Channel<number>(1);
 * await ch.send(42);
 * const [val, ok] = await ch.receive();
 * ```
 */
export class Channel<T> implements AsyncIterable<T> {
	// ring buffer storage when capacity > 0
	#buffer: (T | undefined)[] | null = null;
	#capacity: number;
	#head = 0; // index of next read
	#tail = 0; // index of next write
	#count = 0; // number of items in buffer
	#closed = false;
	#sendWaiters: Array<{
		value: T;
		resolve: () => void;
		reject: (err: any) => void;
		isActive?: () => boolean;
	}> = [];
	#receiveWaiters: Array<{
		resolve: (value: [T, true] | [undefined, false]) => void;
		isActive?: () => boolean;
	}> = [];

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
	 * Create a channel from an iterable or async iterable.
	 * The channel is closed once the iterable is exhausted.
	 *
	 * @example
	 * ```ts
	 * const ch = Chan.from([1, 2, 3]);
	 * for await (const val of ch) {
	 *   console.log(val);
	 * }
	 * ```
	 */
	static from<T>(iterable: Iterable<T> | AsyncIterable<T>, capacity = 0): Channel<T> {
		const ch = new Channel<T>(capacity);
		(async () => {
			try {
				for await (const val of iterable) {
					await ch.send(val);
				}
			} catch (_) {
				// Ignore errors in background sender
			} finally {
				ch.close();
			}
		})();
		return ch;
	}

	/**
	 * [Symbol.asyncIterator] allows using the channel in a for await...of loop.
	 * The loop continues until the channel is closed and all buffered values are received.
	 *
	 * @example
	 * ```ts
	 * for await (const val of ch) {
	 *   console.log(val);
	 * }
	 * ```
	 */
	async *[Symbol.asyncIterator](): AsyncIterator<T> {
		while (true) {
			const [value, ok] = await this.receive();
			if (!ok) {
				break;
			}
			yield value as T;
		}
	}

	/**
	 * Send a value to the channel. For buffered channels, this may block if the buffer is full.
	 * For unbuffered channels, this blocks until a receiver is ready.
	 *
	 * @param value The value to send
	 * @param options Options including AbortSignal and internal isActive check
	 */
	async send(
		value: T,
		{ signal, isActive }: { signal?: AbortSignal; isActive?: () => boolean } = {},
	): Promise<void> {
		if (this.#closed) {
			throw new Error("Channel: send on closed channel");
		}

		if (signal?.aborted) {
			throw signal.reason;
		}

		// If there's a waiting receiver, send directly
		while (this.#receiveWaiters.length > 0) {
			const waiter = this.#receiveWaiters.shift()!;
			if (waiter.isActive && !waiter.isActive()) {
				continue;
			}
			waiter.resolve([value, true]);
			return;
		}

		// If buffered and buffer has space, add to buffer
		if (this.#capacity > 0 && this.#count < this.#capacity) {
			const buf = this.#buffer!;
			buf[this.#tail] = value;
			this.#tail = (this.#tail + 1) % this.#capacity;
			this.#count++;
			return;
		}

		// Otherwise, wait for a receiver
		return new Promise<void>((resolve, reject) => {
			const waiter = { value, resolve, reject, isActive };
			this.#sendWaiters.push(waiter);

			signal?.addEventListener("abort", () => {
				const idx = this.#sendWaiters.indexOf(waiter);
				if (idx !== -1) {
					this.#sendWaiters.splice(idx, 1);
					reject(signal.reason);
				}
			}, { once: true });
		});
	}

	/**
	 * Receive a value from the channel. Returns [value, true] if successful, or [undefined, false] if the channel is closed.
	 *
	 * @param options Options including AbortSignal and internal isActive check
	 */
	async receive(
		{ signal, isActive }: { signal?: AbortSignal; isActive?: () => boolean } = {},
	): Promise<[T, true] | [undefined, false]> {
		if (signal?.aborted) {
			throw signal.reason;
		}

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
		while (this.#sendWaiters.length > 0) {
			const waiter = this.#sendWaiters.shift()!;
			if (waiter.isActive && !waiter.isActive()) {
				continue;
			}
			const val = waiter.value;
			waiter.resolve();
			return [val, true];
		}

		// If channel is closed and no values, return closed signal
		if (this.#closed) {
			return [undefined, false];
		}

		// Otherwise, wait for a sender
		return new Promise<[T, true] | [undefined, false]>((resolve, reject) => {
			const waiter = { resolve, isActive };
			this.#receiveWaiters.push(waiter);

			signal?.addEventListener("abort", () => {
				const idx = this.#receiveWaiters.indexOf(waiter);
				if (idx !== -1) {
					this.#receiveWaiters.splice(idx, 1);
					reject(signal.reason);
				}
			}, { once: true });
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
		const waiters = this.#sendWaiters;
		this.#sendWaiters = [];
		for (const waiter of waiters) {
			if (!waiter.isActive || waiter.isActive()) {
				waiter.reject(new Error("Channel: closed while sending"));
			}
		}

		// Wake up all waiting receivers with closed signal
		const receiveWaiters = this.#receiveWaiters;
		this.#receiveWaiters = [];
		for (const waiter of receiveWaiters) {
			if (!waiter.isActive || waiter.isActive()) {
				waiter.resolve([undefined, false]);
			}
		}
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

		while (this.#sendWaiters.length > 0) {
			const waiter = this.#sendWaiters.shift()!;
			if (waiter.isActive && !waiter.isActive()) {
				continue;
			}
			const val = waiter.value;
			waiter.resolve();
			return [val, true];
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
		while (this.#receiveWaiters.length > 0) {
			const waiter = this.#receiveWaiters.shift()!;
			if (waiter.isActive && !waiter.isActive()) {
				continue;
			}
			waiter.resolve([value, true]);
			return true;
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
			const waiter = this.#sendWaiters.shift()!;
			if (waiter.isActive && !waiter.isActive()) {
				continue;
			}
			const buf = this.#buffer!;
			buf[this.#tail] = waiter.value;
			this.#tail = (this.#tail + 1) % this.#capacity;
			this.#count++;
			waiter.resolve();
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
 * SendChan represents the send-only side of a Channel.
 */
export interface SendChan<T> {
	send(value: T): Promise<void>;
	trySend(value: T): boolean;
	close(): void;
	readonly capacity: number;
	readonly length: number;
	readonly closed: boolean;
}

/**
 * ReceiveChan represents the receive-only side of a Channel.
 */
export interface ReceiveChan<T> extends AsyncIterable<T> {
	receive(): Promise<[T, true] | [undefined, false]>;
	tryReceive(): [T, true] | [undefined, false];
	readonly capacity: number;
	readonly length: number;
	readonly closed: boolean;
}

/**
 * Select cases for channel operations
 */
export interface ReceiveCase<T = any> {
	/** Channel to receive from */
	channel: Channel<T>;
	/** Action to execute when this case is selected */
	action: (value: T | undefined, ok: boolean) => void;
}

export interface SendCase<T = any> {
	/** Channel and value to send */
	channel: Channel<T>;
	value: T;
	/** Action to execute when this case is selected */
	action: () => void;
}

export interface DefaultCase {
	/** Default action when no other cases are ready */
	default: () => void;
}

export type SelectCase<T = any> = ReceiveCase<T> | SendCase<T> | DefaultCase;

/**
 * Select performs a select operation on multiple channel operations.
 * It waits for one of the cases to be ready and executes its action.
 * If multiple cases are ready, one is chosen randomly.
 * If a default case is provided and no other cases are ready, it executes the default action.
 *
 * @param cases Array of select cases (receive, send, or default)
 */
export async function select<T = any>(cases: SelectCase<T>[]): Promise<void> {
	if (cases.length === 0) {
		throw new Error("select: no cases provided");
	}

	const receiveCases: ReceiveCase<T>[] = [];
	const sendCases: SendCase<T>[] = [];
	let defaultCase: DefaultCase | undefined;

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

	// Shuffle cases to ensure fairness when multiple are ready
	const allOps = [...receiveCases, ...sendCases].sort(() => Math.random() - 0.5);

	// 1. Check if any operation is ready immediately
	for (const op of allOps) {
		if ("value" in op) {
			// SendCase
			const sendCase = op as SendCase<T>;
			if (sendCase.channel.canSend()) {
				if (sendCase.channel.trySend(sendCase.value)) {
					sendCase.action();
					return;
				}
			}
		} else {
			// ReceiveCase
			const receiveCase = op as ReceiveCase<T>;
			if (receiveCase.channel.hasData()) {
				const [val, ok] = receiveCase.channel.tryReceive();
				if (ok || receiveCase.channel.closed) {
					receiveCase.action(val, ok);
					return;
				}
			}
		}
	}

	// 2. If no operation is ready and we have a default case, execute it
	if (defaultCase) {
		defaultCase.default();
		return;
	}

	// 3. Otherwise, wait for the first operation to become ready
	let done = false;
	const controller = new AbortController();
	const signal = controller.signal;
	const isActive = () => !done;

	const promises: Promise<void>[] = [];

	for (const op of receiveCases) {
		promises.push(
			op.channel.receive({ signal, isActive }).then(([val, ok]) => {
				if (done) return;
				done = true;
				controller.abort();
				op.action(val, ok);
			}).catch(() => {
				// Ignore abort errors
			}),
		);
	}

	for (const op of sendCases) {
		promises.push(
			op.channel.send(op.value, { signal, isActive }).then(() => {
				if (done) return;
				done = true;
				controller.abort();
				op.action();
			}).catch(() => {
				// Ignore abort errors
			}),
		);
	}

	await Promise.race(promises);
	await Promise.allSettled(promises);
}

/**
 * Helper function to create a receive case for select()
 * @example
 * receive(channel).then((value, ok) => console.log('received:', value))
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
 * Helper function to create a send case for select()
 * @example
 * send(channel, value).then(() => console.log('sent'))
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
 * Helper function to create a default case for select()
 * @example
 * default_(() => console.log('no operation ready'))
 */
export function default_(action: () => void): DefaultCase {
	return { default: action };
}
