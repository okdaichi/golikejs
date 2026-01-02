import { Closer } from "./closer.ts";

/**
 * Writer is the interface that wraps the basic Write method.
 * Write writes len(p) bytes from p to the underlying data stream.
 * It returns the number of bytes written (0 <= n <= len(p)) and any error encountered.
 * Write must return a non-nil error if it returns n < len(p).
 */
export interface Writer {
	write(p: Uint8Array): [number, Error | undefined] | Promise<[number, Error | undefined]>;
}

/**
 * WriterTo is implemented by types that can write their contents to w. The
 * method returns the number of bytes written and an optional error.
 */
export interface WriterTo {
	writeTo(w: Writer): [number, Error | undefined] | Promise<[number, Error | undefined]>;
}

/**
 * WriteCloser is the interface that groups the basic Write and Close methods.
 */
export interface WriteCloser extends Writer, Closer {}
