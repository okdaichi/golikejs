/**
 * I/O primitives and small helpers.
 *
 * This sub-module defines basic stream interfaces and common I/O errors used
 * throughout the library. It intentionally follows Go's `io` package design
 * so that `Reader`/`Writer` semantics are familiar to users coming from Go.
 *
 * Exported highlights:
 * - {@link EOFError} - sentinel end-of-file error returned by `read` operations
 * - {@link Reader}, {@link Writer} - basic async read/write interfaces
 * - {@link ReadCloser}, {@link WriteCloser} - combined interfaces including `close()`
 *
 * Example
 * ```ts
 * import { io } from "@okdaichi/golikejs";
 * // implement a Reader by providing an async read(p: Uint8Array) method
 * ```
 *
 * @module @okdaichi/golikejs/io
 */

export * from "./error.ts";
export * from "./reader.ts";
export * from "./writer.ts";
export * from "./closer.ts";
