/**
 * @module
 * Buffer provides an in-memory byte buffer that implements Reader and Writer interfaces.
 */

import { EOFError } from "../io/error.ts";
import { Reader } from "../io/reader.ts";
import { Writer } from "../io/writer.ts";

// Re-export io types that Buffer implements
export type { Reader, Writer };

/**
 * MinRead is the minimum read size for Buffer.readFrom operations.
 */
export const MinRead = 512;

/**
 * TooLargeError indicates that a buffer operation would exceed the maximum buffer size.
 */
export class TooLargeError extends Error {
	/**
	 * Creates a new TooLargeError.
	 *
	 * @param message - The error message, defaults to "bytes buffer: too large"
	 */
	constructor(message = "bytes buffer: too large") {
		super(message);
		this.name = "TooLargeError";
	}
}

/**
 * Buffer is an in-memory byte buffer that implements Reader and Writer interfaces.
 * Similar to Go's bytes.Buffer, it provides efficient read and write operations
 * with automatic growth and UTF-8 rune handling.
 *
 * @example
 * ```ts
 * import { bytes } from "@okudai/golikejs";
 *
 * const buf = bytes.Buffer.make(128);
 * await buf.write(new TextEncoder().encode("hello"));
 * const data = buf.bytes();
 * ```
 */
export class Buffer implements Reader, Writer {
	#buf: Uint8Array;
	#off: number; // read offset
	#len: number; // write offset
	#lastReadOp: "byte" | "rune" | "read" | null;
	#lastReadSize: number;

	/**
	 * Creates a new Buffer backed by the given memory.
	 *
	 * @param memory - The ArrayBufferLike to use as backing storage
	 */
	constructor(memory: ArrayBufferLike) {
		this.#buf = new Uint8Array(memory);
		this.#off = 0;
		this.#len = 0; // Start with an empty buffer for writing
		this.#lastReadOp = null;
		this.#lastReadSize = 0;
	}

	/**
	 * Creates a new Buffer with the specified capacity.
	 *
	 * @param capacity - The initial capacity in bytes
	 * @returns A new Buffer instance
	 */
	static make(capacity: number): Buffer {
		const buf = new Uint8Array(capacity);
		return new Buffer(buf.buffer);
	}

	/**
	 * Returns a view of the unread portion of the buffer.
	 *
	 * @returns A Uint8Array view of the unread data
	 */
	bytes(): Uint8Array {
		return this.#buf.subarray(this.#off, this.#len);
	}

	/**
	 * Returns the number of unread bytes in the buffer.
	 */
	get size(): number {
		return this.#len - this.#off;
	}

	/**
	 * Returns the buffer's capacity.
	 */
	get capacity(): number {
		return this.#buf.length;
	}

	/**
	 * Returns the number of unread bytes (Go-style method name).
	 *
	 * @returns The number of unread bytes
	 */
	len(): number {
		return this.size;
	}

	/**
	 * Returns the buffer's capacity (Go-style method name).
	 *
	 * @returns The buffer capacity
	 */
	cap(): number {
		return this.capacity;
	}

	/**
	 * Converts the unread portion of the buffer to a UTF-8 string.
	 *
	 * @returns A string decoded from the unread bytes
	 */
	toString(): string {
		return new TextDecoder().decode(this.bytes());
	}

	/**
	 * Writes a UTF-8 encoded string to the buffer.
	 *
	 * @param s - The string to write
	 * @returns A tuple of [bytes written, error]
	 */
	async writeString(s: string): Promise<[number, Error | undefined]> {
		const data = new TextEncoder().encode(s);
		return await this.write(data);
	}

	/**
	 * Returns the next n bytes from the buffer and advances the read position.
	 *
	 * @param n - The number of bytes to return
	 * @returns A Uint8Array containing the next n bytes (or fewer if EOF)
	 * @throws {Error} If n is negative
	 */
	next(n: number): Uint8Array {
		if (n < 0) throw new Error("bytes buffer: negative next length");
		const avail = this.size;
		const take = n > avail ? avail : n;
		const res = this.#buf.subarray(this.#off, this.#off + take);
		this.#off += take;
		this.#lastReadOp = "read";
		this.#lastReadSize = take;
		// if (this.#off === this.#len) this.reset();
		return res;
	}

	/**
	 * Discards all but the first n unread bytes from the buffer.
	 *
	 * @param n - The number of bytes to keep
	 * @throws {Error} If n is negative or greater than buffer size
	 */
	truncate(n: number) {
		if (n < 0 || n > this.size) {
			throw new Error("bytes buffer: truncate out of range");
		}
		this.#len = this.#off + n;
		// if (this.#off === this.#len) this.reset();
	}

	/**
	 * Unreads the last byte read by readByte.
	 *
	 * @returns An error if the last operation was not readByte, undefined otherwise
	 */
	unreadByte(): Error | undefined {
		if (this.#lastReadOp !== "byte" || this.#lastReadSize !== 1) {
			return new Error("bytes buffer: cannot unread byte");
		}
		if (this.#off <= 0) return new Error("bytes buffer: cannot unread byte");
		this.#off -= 1;
		this.#lastReadOp = null;
		this.#lastReadSize = 0;
		return undefined;
	}

	/**
	 * ReadRune reads a single UTF-8 encoded Unicode code point from the buffer, returning the rune and its
	 * size in bytes. If no data is available it returns EOFError. If the encoding is invalid it returns
	 * the Unicode replacement character (0xFFFD) and consumes one byte.
	 */
	readRune(): [number, number, Error | undefined] {
		const avail = this.size;
		if (avail === 0) return [0, 0, new EOFError()];
		const b0 = this.#buf[this.#off]!;
		let code = 0;
		let size = 0;
		if (b0 < 0x80) {
			code = b0;
			size = 1;
		} else if ((b0 & 0xe0) === 0xc0) {
			size = 2;
		} else if ((b0 & 0xf0) === 0xe0) {
			size = 3;
		} else if ((b0 & 0xf8) === 0xf0) {
			size = 4;
		} else {
			// invalid leading byte
			this.#off += 1;
			this.#lastReadOp = "rune";
			this.#lastReadSize = 1;
			// if (this.#off === this.#len) this.reset();
			return [0xfffd, 1, undefined];
		}
		if (size > avail) {
			// not enough bytes to form rune -> replacement
			this.#off += 1;
			this.#lastReadOp = "rune";
			this.#lastReadSize = 1;
			// if (this.#off === this.#len) this.reset();
			return [0xfffd, 1, undefined];
		}
		// validate continuation bytes
		if (size === 2) {
			const b1 = this.#buf[this.#off + 1]!;
			if ((b1 & 0xc0) !== 0x80) {
				this.#off += 1;
				this.#lastReadOp = "rune";
				this.#lastReadSize = 1;
				// if (this.#off === this.#len) this.reset();
				return [0xfffd, 1, undefined];
			}
			code = ((b0 & 0x1f) << 6) | (b1 & 0x3f);
			// overlong check: must be >= 0x80
			if (code < 0x80) {
				this.#off += 1;
				this.#lastReadOp = "rune";
				this.#lastReadSize = 1;
				return [0xfffd, 1, undefined];
			}
		} else if (size === 3) {
			const b1 = this.#buf[this.#off + 1]!;
			const b2 = this.#buf[this.#off + 2]!;
			if ((b1 & 0xc0) !== 0x80 || (b2 & 0xc0) !== 0x80) {
				this.#off += 1;
				this.#lastReadOp = "rune";
				this.#lastReadSize = 1;
				// if (this.#off === this.#len) this.reset();
				return [0xfffd, 1, undefined];
			}
			code = ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f);
			// overlong check: must be >= 0x800
			if (code < 0x800) {
				this.#off += 1;
				this.#lastReadOp = "rune";
				this.#lastReadSize = 1;
				return [0xfffd, 1, undefined];
			}
		} else if (size === 4) {
			const b1 = this.#buf[this.#off + 1]!;
			const b2 = this.#buf[this.#off + 2]!;
			const b3 = this.#buf[this.#off + 3]!;
			if ((b1 & 0xc0) !== 0x80 || (b2 & 0xc0) !== 0x80 || (b3 & 0xc0) !== 0x80) {
				this.#off += 1;
				this.#lastReadOp = "rune";
				this.#lastReadSize = 1;
				// if (this.#off === this.#len) this.reset();
				return [0xfffd, 1, undefined];
			}
			code = ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
			// overlong check: must be >= 0x10000
			if (code < 0x10000) {
				this.#off += 1;
				this.#lastReadOp = "rune";
				this.#lastReadSize = 1;
				return [0xfffd, 1, undefined];
			}
		}
		// reject surrogate halves and code points beyond Unicode max
		if ((code >= 0xd800 && code <= 0xdfff) || code > 0x10ffff) {
			this.#off += 1;
			this.#lastReadOp = "rune";
			this.#lastReadSize = 1;
			return [0xfffd, 1, undefined];
		}
		this.#off += size;
		this.#lastReadOp = "rune";
		this.#lastReadSize = size;
		// if (this.#off === this.#len) this.reset();
		return [code, size, undefined];
	}

	/**
	 * Unreads the last rune read by readRune.
	 *
	 * @returns An error if the last operation was not readRune, undefined otherwise
	 */
	unreadRune(): Error | undefined {
		if (this.#lastReadOp !== "rune" || this.#lastReadSize <= 0) {
			return new Error("bytes buffer: cannot unread rune");
		}
		if (this.#off < this.#lastReadSize) return new Error("bytes buffer: cannot unread rune");
		this.#off -= this.#lastReadSize;
		this.#lastReadOp = null;
		this.#lastReadSize = 0;
		return undefined;
	}

	/**
	 * readBytes reads until the first occurrence of delim (included) and returns a new Uint8Array.
	 *
	 * Return shape: [Uint8Array, undefined] | [undefined, Error]
	 * - When a slice including delim is found, returns the slice and undefined error.
	 * - When the buffer is empty or delim is not found (EOF), returns [undefined, EOFError()].
	 * 	This mirrors Go's bytes.Buffer: in Go a nil slice is returned to indicate 'no data' in certain EOF cases;
	 * 	in TypeScript we use `undefined` to represent that nil value.
	 */
	readBytes(delim: number): [Uint8Array, undefined] | [undefined, Error] {
		const start = this.#off;
		if (start >= this.#len) {
			return [undefined, new EOFError()];
		}
		// use indexOf for faster search
		const idx = this.#buf.subarray(start, this.#len).indexOf(delim);
		if (idx >= 0) {
			const end = start + idx;
			const res = this.#buf.subarray(start, end + 1);
			this.#lastReadOp = "read";
			this.#lastReadSize = res.length;
			this.#off = end + 1;
			return [res.slice(), undefined];
		}
		// delim not found
		// per API, when delim not found we return undefined and EOF
		const res = this.bytes();
		this.#lastReadOp = "read";
		this.#lastReadSize = res.length;
		this.#off = this.#len;
		return [undefined, new EOFError()];
	}

	/**
	 * readString behaves like readBytes but returns a string.
	 *
	 * Return shape: [string, undefined] | [string, Error]
	 * - When delim is found, returns the decoded string and undefined error.
	 * - When delim is not found (EOF), returns the zero value for string (empty string "")
	 *   together with EOFError(). This choice maps Go's nil-slice semantics to a safe
	 *   TypeScript string zero value while still signalling EOF via the error return.
	 */
	readString(delim: number): [string, undefined] | [string, Error] {
		const [b, err] = this.readBytes(delim) as [Uint8Array | undefined, Error | undefined];
		if (b === undefined) {
			// When bytes version returns undefined (delim not found / EOF),
			// return the zero value for string (empty string) along with the error.
			return ["", err as Error];
		}
		return [new TextDecoder().decode(b), undefined];
	}

	/**
	 * Writes a single Unicode code point to the buffer.
	 *
	 * @param r - The Unicode code point to write
	 * @returns A tuple of [bytes written, error]
	 */
	async writeRune(r: number): Promise<[number, Error | undefined]> {
		const s = String.fromCodePoint(r);
		const data = new TextEncoder().encode(s);
		return await this.write(data);
	}

	/**
	 * Resets the buffer to be empty.
	 */
	reset() {
		this.#off = 0;
		this.#len = 0;
	}

	/**
	 * Reads data into the provided buffer.
	 * Implements the Reader interface.
	 *
	 * @param buf - The buffer to read into
	 * @returns A tuple of [bytes read, error]
	 */
	async read(buf: Uint8Array): Promise<[number, Error | undefined]> {
		const bytesAvailable = this.size;
		const bytesToRead = Math.min(buf.length, bytesAvailable);
		if (bytesToRead === 0) {
			return [0, new EOFError()];
		}
		buf.set(this.#buf.subarray(this.#off, this.#off + bytesToRead));
		this.#off += bytesToRead;
		this.#lastReadOp = null;
		this.#lastReadSize = 0;
		// if (this.#off === this.#len) {
		//     this.reset();
		// }
		return [bytesToRead, undefined];
	}

	/**
	 * Reads and returns the next byte from the buffer.
	 *
	 * @returns A tuple of [byte value, error]
	 */
	readByte(): [number, Error | undefined] {
		if (this.size < 1) {
			return [0, new EOFError()];
		}
		const value = this.#buf[this.#off]!;
		this.#off += 1;
		this.#lastReadOp = "byte";
		this.#lastReadSize = 1;
		// if (this.#off === this.#len) {
		//     this.reset();
		// }
		return [value, undefined];
	}

	/**
	 * Writes data to the buffer.
	 * Implements the Writer interface.
	 *
	 * @param data - The data to write
	 * @returns A tuple of [bytes written, error]
	 */
	async write(data: Uint8Array): Promise<[number, Error | undefined]> {
		this.grow(data.length);
		this.#buf.set(data, this.#len);
		this.#len += data.length;
		// writing invalidates unread state
		this.#lastReadOp = null;
		this.#lastReadSize = 0;
		return [data.length, undefined];
	}

	/**
	 * Writes a single byte to the buffer.
	 *
	 * @param value - The byte value to write
	 */
	writeByte(value: number): void {
		this.grow(1);
		this.#buf[this.#len] = value;
		this.#len += 1;
		this.#lastReadOp = null;
		this.#lastReadSize = 0;
	}

	/**
	 * Grows the buffer to guarantee space for n more bytes.
	 *
	 * @param n - The number of additional bytes needed
	 * @throws {Error} If n is negative
	 */
	grow(n: number) {
		if (n < 0) {
			throw new Error("Cannot grow buffer by a negative size");
		}
		const required = this.size + n;
		if (required > this.capacity) {
			// Create a new buffer having an enough capacity
			const newBuf = new Uint8Array(Math.max(required, this.capacity * 2));
			// Copy the existing data to the new buffer from the head
			newBuf.set(this.bytes());
			this.#buf = newBuf;
		} else if (this.#off > 0) {
			// Slide the buffer to the head
			this.#buf.copyWithin(0, this.#off, this.#len);
		}

		// Adjust the offsets
		this.#len -= this.#off;
		this.#off = 0;
	}

	/**
	 * Read from r until EOF and append to the buffer. Returns number of bytes read.
	 */
	async readFrom(r: Reader): Promise<[number, Error | undefined]> {
		// Fast path: if the source implements WriterTo (i.e., can write itself to our Writer), delegate.
		if ((r as any).writeTo instanceof Function) {
			return await (r as any).writeTo(this as any);
		}
		let total = 0;
		const tmp = new Uint8Array(MinRead);
		while (true) {
			const [n, err] = await r.read(tmp);
			if (n > 0) {
				const slice = tmp.subarray(0, n);
				await this.write(slice);
				total += n;
			}
			if (err instanceof EOFError) {
				return [total, undefined];
			}
			if (err) {
				return [total, err];
			}
			// otherwise continue
		}
	}

	/**
	 * Write buffer contents to w until empty. Returns number of bytes written.
	 */
	async writeTo(w: Writer): Promise<[number, Error | undefined]> {
		// Fast path: if the destination implements ReaderFrom, delegate to it.
		if ((w as any).readFrom instanceof Function) {
			return await (w as any).readFrom(this as any);
		}
		let total = 0;
		while (this.size > 0) {
			const chunk = this.bytes();
			const [n, err] = await w.write(chunk);
			if (n > 0) {
				this.#off += n;
				total += n;
				if (this.#off === this.#len) this.reset();
			}
			if (err) return [total, err];
			if (n === 0 && !err) break; // avoid tight loop
		}
		return [total, undefined];
	}

	// reserve(n: number): Uint8Array {
	// 	this.grow(n);
	// 	const start = this.#len;
	// 	const end = start + n;
	// 	this.#len = end;
	// 	return this.#buf.subarray(start, end);
	// }
}
