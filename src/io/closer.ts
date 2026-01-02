/**
 * Closer is the interface that wraps the basic Close method.
 * Close closes the stream.
 */
export interface Closer {
	/**
	 * Closes the stream.
	 *
	 * @returns A promise that resolves with an error if closing failed, or undefined on success
	 */
	close(): Promise<Error | undefined>;
}
