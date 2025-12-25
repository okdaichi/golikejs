/**
 * @module
 * Search and comparison functions for byte slices.
 */

/**
 * Compares two byte slices lexicographically.
 *
 * @param a - The first byte slice
 * @param b - The second byte slice
 * @returns 0 if a==b, -1 if a < b, and +1 if a > b
 */
export function compare(a: Uint8Array, b: Uint8Array): number {
	const len = Math.min(a.length, b.length);
	for (let i = 0; i < len; i++) {
		if (a[i] !== b[i]) {
			return a[i]! < b[i]! ? -1 : 1;
		}
	}
	if (a.length < b.length) {
		return -1;
	}
	if (a.length > b.length) {
		return 1;
	}
	return 0;
}

/**
 * Returns a copy of the given byte slice.
 *
 * @param src - The source byte slice to clone
 * @returns A new byte slice containing a copy of src
 */
export function clone(src: Uint8Array): Uint8Array {
	const dst = new Uint8Array(src.length);
	dst.set(src);
	return dst;
}

/**
 * Reports whether subslice is within b.
 *
 * @param b - The byte slice to search in
 * @param subslice - The byte slice to search for
 * @returns true if subslice is found in b, false otherwise
 */
export function contains(b: Uint8Array, subslice: Uint8Array): boolean {
	return index(b, subslice) >= 0;
}

/**
 * Reports whether any of the UTF-8-encoded code points in chars are within b.
 *
 * @param b - The byte slice to search in
 * @param chars - String containing characters to search for
 * @returns true if any character from chars is found in b
 */
export function containsAny(b: Uint8Array, chars: string): boolean {
	const charBytes = new TextEncoder().encode(chars);
	for (const char of charBytes) {
		if (b.includes(char)) {
			return true;
		}
	}
	return false;
}

/**
 * Counts the number of non-overlapping instances of sep in s.
 * If sep is an empty slice, count returns 1 + the number of UTF-8-encoded code points in s.
 *
 * @param s - The byte slice to search in
 * @param sep - The separator to count
 * @returns The number of occurrences of sep in s
 */
export function count(s: Uint8Array, sep: Uint8Array): number {
	if (sep.length === 0) {
		return new TextDecoder().decode(s).length + 1;
	}
	let count = 0;
	let pos = 0;
	while ((pos = index(s.subarray(pos), sep)) >= 0) {
		count++;
		pos += sep.length;
	}
	return count;
}

/**
 * Reports whether a and b are the same length and contain the same bytes.
 *
 * @param a - The first byte slice
 * @param b - The second byte slice
 * @returns true if a and b are equal
 */
export function equal(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) {
		return false;
	}
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	return true;
}

/**
 * Reports whether s and t, interpreted as UTF-8 strings, are equal under Unicode case-folding.
 *
 * @param s - The first byte slice
 * @param t - The second byte slice
 * @returns true if s and t are equal ignoring case
 */
export function equalFold(s: Uint8Array, t: Uint8Array): boolean {
	const strS = new TextDecoder().decode(s).toLowerCase();
	const strT = new TextDecoder().decode(t).toLowerCase();
	return strS === strT;
}

/**
 * Tests whether the byte slice s begins with prefix.
 *
 * @param s - The byte slice to test
 * @param prefix - The prefix to check for
 * @returns true if s starts with prefix
 */
export function hasPrefix(s: Uint8Array, prefix: Uint8Array): boolean {
	if (prefix.length > s.length) {
		return false;
	}
	for (let i = 0; i < prefix.length; i++) {
		if (s[i] !== prefix[i]) {
			return false;
		}
	}
	return true;
}

/**
 * Tests whether the byte slice s ends with suffix.
 *
 * @param s - The byte slice to test
 * @param suffix - The suffix to check for
 * @returns true if s ends with suffix
 */
export function hasSuffix(s: Uint8Array, suffix: Uint8Array): boolean {
	if (suffix.length > s.length) {
		return false;
	}
	const start = s.length - suffix.length;
	for (let i = 0; i < suffix.length; i++) {
		if (s[start + i] !== suffix[i]) {
			return false;
		}
	}
	return true;
}

/**
 * Returns the index of the first instance of sep in s, or -1 if sep is not present in s.
 *
 * @param s - The byte slice to search in
 * @param sep - The separator to search for
 * @returns The index of the first occurrence, or -1 if not found
 */
export function index(s: Uint8Array, sep: Uint8Array): number {
	if (sep.length === 0) {
		return 0;
	}
	if (sep.length > s.length) {
		return -1;
	}
	for (let i = 0; i <= s.length - sep.length; i++) {
		let match = true;
		for (let j = 0; j < sep.length; j++) {
			if (s[i + j] !== sep[j]) {
				match = false;
				break;
			}
		}
		if (match) {
			return i;
		}
	}
	return -1;
}

/**
 * Interprets s as a sequence of UTF-8-encoded Unicode code points.
 * Returns the byte index of the first occurrence in s of any of the Unicode code points in chars.
 *
 * @param s - The byte slice to search in
 * @param chars - String containing characters to search for
 * @returns The byte index of the first match, or -1 if no match found
 */
export function indexAny(s: Uint8Array, chars: string): number {
	const charSet = new Set(chars.split("").map((c) => c.charCodeAt(0)));
	const str = new TextDecoder().decode(s);
	for (let i = 0; i < str.length; i++) {
		if (charSet.has(str.charCodeAt(i))) {
			return new TextEncoder().encode(str.slice(0, i)).length;
		}
	}
	return -1;
}

/**
 * Returns the index of the first instance of c in s, or -1 if c is not present in s.
 *
 * @param s - The byte slice to search in
 * @param c - The byte value to search for
 * @returns The index of the first occurrence, or -1 if not found
 */
export function indexByte(s: Uint8Array, c: number): number {
	for (let i = 0; i < s.length; i++) {
		if (s[i] === c) {
			return i;
		}
	}
	return -1;
}

/**
 * Interprets s as a sequence of UTF-8-encoded code points.
 * Returns the byte index in s of the first Unicode code point satisfying f(c), or -1 if none do.
 *
 * @param s - The byte slice to search in
 * @param f - Predicate function to test each code point
 * @returns The byte index of the first match, or -1 if no match found
 */
export function indexFunc(s: Uint8Array, f: (r: number) => boolean): number {
	const str = new TextDecoder().decode(s);
	for (let i = 0; i < str.length; i++) {
		if (f(str.charCodeAt(i))) {
			return new TextEncoder().encode(str.slice(0, i)).length;
		}
	}
	return -1;
}

/**
 * Interprets s as a sequence of UTF-8-encoded Unicode code points.
 * Returns the byte index of the first occurrence in s of the given rune, or -1 if rune is not present in s.
 *
 * @param s - The byte slice to search in
 * @param r - The rune (code point) to search for
 * @returns The byte index of the first occurrence, or -1 if not found
 */
export function indexRune(s: Uint8Array, r: number): number {
	const str = new TextDecoder().decode(s);
	const runeStr = String.fromCharCode(r);
	const index = str.indexOf(runeStr);
	if (index === -1) {
		return -1;
	}
	return new TextEncoder().encode(str.slice(0, index)).length;
}

/**
 * Returns the index of the last instance of sep in s, or -1 if sep is not present in s.
 *
 * @param s - The byte slice to search in
 * @param sep - The separator to search for
 * @returns The index of the last occurrence, or -1 if not found
 */
export function lastIndex(s: Uint8Array, sep: Uint8Array): number {
	if (sep.length === 0) {
		return s.length;
	}
	if (sep.length > s.length) {
		return -1;
	}
	for (let i = s.length - sep.length; i >= 0; i--) {
		let match = true;
		for (let j = 0; j < sep.length; j++) {
			if (s[i + j] !== sep[j]) {
				match = false;
				break;
			}
		}
		if (match) {
			return i;
		}
	}
	return -1;
}

/**
 * Interprets s as a sequence of UTF-8-encoded Unicode code points.
 * Returns the byte index of the last occurrence in s of any of the Unicode code points in chars.
 *
 * @param s - The byte slice to search in
 * @param chars - String containing characters to search for
 * @returns The byte index of the last match, or -1 if no match found
 */
export function lastIndexAny(s: Uint8Array, chars: string): number {
	const charSet = new Set(chars.split("").map((c) => c.charCodeAt(0)));
	const str = new TextDecoder().decode(s);
	for (let i = str.length - 1; i >= 0; i--) {
		if (charSet.has(str.charCodeAt(i))) {
			return new TextEncoder().encode(str.slice(0, i)).length;
		}
	}
	return -1;
}

/**
 * Returns the index of the last instance of c in s, or -1 if c is not present in s.
 *
 * @param s - The byte slice to search in
 * @param c - The byte value to search for
 * @returns The index of the last occurrence, or -1 if not found
 */
export function lastIndexByte(s: Uint8Array, c: number): number {
	for (let i = s.length - 1; i >= 0; i--) {
		if (s[i] === c) {
			return i;
		}
	}
	return -1;
}

/**
 * Interprets s as a sequence of UTF-8-encoded code points.
 * Returns the byte index in s of the last Unicode code point satisfying f(c), or -1 if none do.
 *
 * @param s - The byte slice to search in
 * @param f - Predicate function to test each code point
 * @returns The byte index of the last match, or -1 if no match found
 */
export function lastIndexFunc(s: Uint8Array, f: (r: number) => boolean): number {
	const str = new TextDecoder().decode(s);
	for (let i = str.length - 1; i >= 0; i--) {
		if (f(str.charCodeAt(i))) {
			return new TextEncoder().encode(str.slice(0, i)).length;
		}
	}
	return -1;
}
