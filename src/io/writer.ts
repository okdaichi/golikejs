import { Closer } from "./closer.ts";

/**
 * Writer is the interface that wraps the basic Write method.
 * Write writes len(p) bytes from p to the underlying data stream.
 * It returns the number of bytes written (0 <= n <= len(p)) and any error encountered.
 * Write must return a non-nil error if it returns n < len(p).
 */
export interface Writer {
	/**
	 * Writes len(p) bytes from p to the underlying data stream.
	 *
	 * @param p - The buffer to write from
	 * @returns A tuple of [bytes written, error]
	 */
	write(p: Uint8Array): Promise<[number, Error | undefined]>;
}

/**
 * WriterTo is implemented by types that can write their contents to w. The
 * method returns the number of bytes written and an optional error.
 */
export interface WriterTo {
	/**
	 * Writes contents to w.
	 *
	 * @param w - The Writer to write to
	 * @returns A tuple of [bytes written, error]
	 */
	writeTo(w: Writer): Promise<[number, Error | undefined]>;
}

/**
 * WriteCloser is the interface that groups the basic Write and Close methods.
 */
export interface WriteCloser extends Writer, Closer {}

export type { Closer };
