import { Closer } from "./closer.ts";

/**
 * Reader is the interface that wraps the basic Read method.
 * Read reads up to len(p) bytes into p.
 * It returns the number of bytes read (0 <= n <= len(p)) and any error encountered.
 * Even if Read returns n < len(p), it may use all of p as scratch space during the call.
 * If some data is available but not len(p) bytes, Read conventionally returns what is available instead of waiting for more.
 * When Read encounters an end-of-file condition, it returns n, EOF.
 */
export interface Reader {
	/**
	 * Reads up to len(p) bytes into p.
	 *
	 * @param p - The buffer to read into
	 * @returns A tuple of [bytes read, error]
	 */
	read(p: Uint8Array): Promise<[number, Error | undefined]>;
}

/**
 * ReaderFrom is implemented by types that can read data from r until EOF and
 * append it to themselves. The method returns the number of bytes read and an
 * optional error.
 */
export interface ReaderFrom {
	/**
	 * Reads from r until EOF and appends to the buffer.
	 *
	 * @param r - The Reader to read from
	 * @returns A tuple of [bytes read, error]
	 */
	readFrom(r: Reader): Promise<[number, Error | undefined]>;
}

/**
 * ReadCloser is the interface that groups the basic Read and Close methods.
 */
export interface ReadCloser extends Reader, Closer {}

export type { Closer };
