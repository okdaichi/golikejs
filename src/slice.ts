/**
 * @module
 * A minimal Go-like slice implementation for JS/TS.
 * Supports backing by plain Array<T> or by TypedArray constructors (Uint8Array, etc.).
 */

/**
 * TypedArray represents all JavaScript typed array types.
 */
export type TypedArray =
	| Uint8Array
	| Int8Array
	| Uint16Array
	| Int16Array
	| Uint32Array
	| Int32Array
	| Float32Array
	| Float64Array;

/**
 * TypedArrayConstructor represents constructors for typed arrays.
 */
export type TypedArrayConstructor = { new (length: number): TypedArray; BYTES_PER_ELEMENT?: number };

/**
 * Slice implements a Go-like slice with support for plain arrays and typed arrays.
 * Similar to Go slices, a Slice is a view into an underlying array with length and capacity.
 *
 * @template T - The type of elements in the slice
 *
 * @example
 * ```ts
 * import { Slice, make } from "@okudai/golikejs";
 *
 * const s = make(Array, 5, 10);
 * s.set(0, "hello");
 * const value = s.get(0);
 * ```
 */
export class Slice<T> implements Iterable<T> {
	/**
	 * The underlying array storage (Array<T> or TypedArray).
	 */
	backing: any; // Array<T> or TypedArray

	/**
	 * The typed array constructor, present for typed array slices.
	 */
	ctor?: TypedArrayConstructor; // present for typed arrays

	/**
	 * The starting index in the backing array.
	 */
	start: number;

	/**
	 * The length of the slice.
	 */
	len: number;

	/**
	 * The capacity of the slice.
	 */
	cap: number;

	/**
	 * Creates a new Slice instance.
	 *
	 * @param backing - The underlying array storage
	 * @param start - Starting index in the backing array
	 * @param len - Length of the slice
	 * @param cap - Capacity of the slice
	 */
	constructor(backing: any, start: number, len: number, cap: number) {
		this.backing = backing;
		this.start = start;
		this.len = len;
		this.cap = cap;
		// infer typed array constructor from backing if it's a typed array view
		// ArrayBuffer.isView returns true for typed arrays and DataView; exclude DataView
		if (ArrayBuffer.isView(backing) && !(backing instanceof DataView)) {
			// the constructor property of the typed array is the constructor function
			this.ctor = backing.constructor as TypedArrayConstructor;
		} else {
			this.ctor = undefined;
		}
	}

	/**
	 * Gets the element at the specified index.
	 *
	 * @param i - The index to access
	 * @returns The element at index i
	 * @throws {RangeError} If index is out of range
	 */
	get(i: number): T {
		if (i < 0 || i >= this.len) throw new RangeError("index out of range");
		return this.backing[this.start + i];
	}

	/**
	 * Sets the element at the specified index.
	 *
	 * @param i - The index to set
	 * @param v - The value to set
	 * @throws {RangeError} If index is out of range
	 */
	set(i: number, v: T): void {
		if (i < 0 || i >= this.len) throw new RangeError("index out of range");
		this.backing[this.start + i] = v;
	}

	/**
	 * Returns a new Slice that shares the same backing array.
	 * Similar to Go's slice operation, the new slice is a view into the same underlying data.
	 *
	 * @param a - Start index (inclusive), defaults to 0
	 * @param b - End index (exclusive), defaults to slice length
	 * @returns A new Slice sharing the same backing array
	 * @throws {RangeError} If indices are out of range
	 */
	slice(a = 0, b?: number): Slice<T> {
		if (a < 0) throw new RangeError("slice start out of range");
		const bb = b === undefined ? this.len : b;
		if (bb < a || bb > this.len) throw new RangeError("slice end out of range");
		const newStart = this.start + a;
		const newLen = bb - a;
		const newCap = this.cap - a;
		return new Slice<T>(this.backing, newStart, newLen, newCap);
	}

	/**
	 * Converts the slice to a standard JavaScript array or typed array view.
	 * For typed arrays, returns a subarray view. For regular arrays, returns a copy.
	 *
	 * @returns A JavaScript array or typed array containing the slice elements
	 */
	toArray(): T[] | TypedArray {
		if (this.ctor) {
			// typed array: return subarray view
			return (this.backing as TypedArray).subarray(this.start, this.start + this.len);
		}
		return this.backing.slice(this.start, this.start + this.len);
	}

	/**
	 * Returns an iterator for the slice elements.
	 * Enables use of for...of loops and other iterable protocols.
	 *
	 * @returns An iterator over the slice elements
	 */
	[Symbol.iterator](): Iterator<T> {
		let i = 0;
		return {
			next: (): IteratorResult<T> => {
				if (i < this.len) {
					const v = this.backing[this.start + i];
					i++;
					return { done: false, value: v };
				}
				return { done: true, value: undefined as any };
			},
		};
	}
}

/**
 * Creates a new slice or map, similar to Go's make builtin.
 * Supports creating slices backed by arrays or typed arrays, and creating maps.
 *
 * @template T - The element type
 * @param ctor - The constructor (Array, TypedArray constructor, or Map)
 * @param length - The initial length (for maps, this is ignored)
 * @param capacity - The capacity (defaults to length)
 * @returns A new Slice or Map
 *
 * @example
 * ```ts
 * import { make } from "@okudai/golikejs";
 *
 * // Create a slice of length 5, capacity 10
 * const s = make(Array, 5, 10);
 *
 * // Create a typed array slice
 * const bytes = make(Uint8Array, 100);
 *
 * // Create a map
 * const m = make(Map, 0);
 * ```
 */
export function make<T>(ctor: any, length: number, capacity?: number): Slice<T> | Map<any, any> {
	if (ctor === Map) {
		// initialCapacity is ignored for JS Map
		return new Map();
	}

	const cap = capacity === undefined ? length : capacity;
	// TypedArray constructors: create typed backing
	if (
		typeof ctor === "function" &&
		(ctor.prototype instanceof Uint8Array ||
			ctor === Uint8Array ||
			ctor === Int8Array ||
			ctor === Uint16Array ||
			ctor === Int16Array ||
			ctor === Uint32Array ||
			ctor === Int32Array ||
			ctor === Float32Array ||
			ctor === Float64Array)
	) {
		const backing = new (ctor as TypedArrayConstructor)(cap);
		// zero-initialized; len may be smaller than cap
		return new Slice<T>(backing, 0, length, cap);
	}

	// default: plain JS array backing
	const backing = new Array<T>(cap);
	return new Slice<T>(backing, 0, length, cap);
}

/**
 * Appends elements to a slice and returns the resulting slice.
 * Similar to Go's append builtin, may reallocate if capacity is exceeded.
 *
 * @template T - The element type
 * @param s - The slice to append to
 * @param items - The elements to append
 * @returns A new Slice containing the original elements plus the appended items
 *
 * @example
 * ```ts
 * import { make, append } from "@okudai/golikejs";
 *
 * let s = make(Array, 0, 5);
 * s = append(s, 1, 2, 3);
 * ```
 */
export function append<T>(s: Slice<T>, ...items: T[]): Slice<T> {
	const need = s.len + items.length;
	if (need > s.cap) {
		// determine new cap
		const newCap = Math.max(need, Math.max(1, s.cap) * 2);
		let newBacking: any;
		const newStart = 0;
		if (s.ctor) {
			// typed array: allocate new typed array
			newBacking = new (s.ctor as any)(newCap);
			// copy existing
			for (let i = 0; i < s.len; i++) newBacking[i] = s.backing[s.start + i];
		} else {
			newBacking = new Array<T>(newCap);
			for (let i = 0; i < s.len; i++) newBacking[i] = s.backing[s.start + i];
		}
		// set items
		for (let i = 0; i < items.length; i++) {
			newBacking[s.len + i] = items[i];
		}
		return new Slice<T>(newBacking, newStart, need, newCap);
	} else {
		// can append in place, but since we return new slice, need to copy
		// actually, to emulate Go, if cap allows, we can share backing but adjust len
		// but since Slice is immutable in a way, better to create new with same backing
		// Go's append returns a new slice descriptor
		const newBacking = s.backing;
		const newStart = s.start;
		if (s.start + need > s.backing.length) {
			// rare case, extend backing
			if (!s.ctor) {
				s.backing.length = s.start + s.cap;
			}
		}
		// set items
		for (let i = 0; i < items.length; i++) {
			newBacking[s.start + s.len + i] = items[i];
		}
		return new Slice<T>(newBacking, newStart, need, s.cap);
	}
}
