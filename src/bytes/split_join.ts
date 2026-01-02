/**
 * @module
 * Functions for splitting and joining byte slices.
 */

/**
 * Slices s around the first instance of sep, returning the text before and after sep.
 * The found result reports whether sep appears in s.
 * If sep does not appear in s, cut returns s, empty slice, and false.
 *
 * @param s - The byte slice to cut
 * @param sep - The separator to cut around
 * @returns A tuple of [before, after, found]
 */
export function cut(s: Uint8Array, sep: Uint8Array): [Uint8Array, Uint8Array, boolean] {
	const idx = index(s, sep);
	if (idx < 0) {
		return [s, new Uint8Array(0), false];
	}
	return [s.subarray(0, idx), s.subarray(idx + sep.length), true];
}

/**
 * Returns s without the provided leading prefix slice and reports whether it found the prefix.
 * If s doesn't start with prefix, returns s, false. If prefix is empty, returns s, true.
 *
 * @param s - The byte slice to process
 * @param prefix - The prefix to cut
 * @returns A tuple of [result, found]
 */
export function cutPrefix(s: Uint8Array, prefix: Uint8Array): [Uint8Array, boolean] {
	if (prefix.length === 0) {
		return [s, true];
	}
	if (hasPrefix(s, prefix)) {
		return [s.subarray(prefix.length), true];
	}
	return [s, false];
}

/**
 * Returns s without the provided ending suffix slice and reports whether it found the suffix.
 * If s doesn't end with suffix, returns s, false. If suffix is empty, returns s, true.
 *
 * @param s - The byte slice to process
 * @param suffix - The suffix to cut
 * @returns A tuple of [result, found]
 */
export function cutSuffix(s: Uint8Array, suffix: Uint8Array): [Uint8Array, boolean] {
	if (suffix.length === 0) {
		return [s, true];
	}
	if (hasSuffix(s, suffix)) {
		return [s.subarray(0, s.length - suffix.length), true];
	}
	return [s, false];
}

/**
 * Interprets s as a sequence of UTF-8-encoded code points.
 * Splits the slice s around each instance of one or more consecutive white space characters.
 *
 * @param s - The byte slice to split
 * @returns An array of byte slices representing fields
 */
export function fields(s: Uint8Array): Uint8Array[] {
	const str = new TextDecoder().decode(s);
	const fields = str.split(/\s+/).filter((f) => f.length > 0);
	return fields.map((f) => new TextEncoder().encode(f));
}

/**
 * Interprets s as a sequence of UTF-8-encoded code points.
 * Splits the slice s into subslices according to the predicate f.
 *
 * @param s - The byte slice to split
 * @param f - Predicate function to determine split points
 * @returns An array of byte slices
 */
export function fieldsFunc(s: Uint8Array, f: (r: number) => boolean): Uint8Array[] {
	const result: Uint8Array[] = [];
	let start = 0;
	const str = new TextDecoder().decode(s);
	for (let i = 0; i < str.length; i++) {
		if (f(str.charCodeAt(i))) {
			if (start < i) {
				result.push(new TextEncoder().encode(str.slice(start, i)));
			}
			start = i + 1;
		}
	}
	if (start < str.length) {
		result.push(new TextEncoder().encode(str.slice(start)));
	}
	return result;
}

/**
 * Concatenates the elements of s to create a new byte slice.
 * The separator sep is placed between elements in the result.
 *
 * @param s - Array of byte slices to join
 * @param sep - The separator to place between elements
 * @returns A new byte slice with joined elements
 */
export function join(s: Uint8Array[], sep: Uint8Array): Uint8Array {
	if (s.length === 0) {
		return new Uint8Array(0);
	}
	if (s.length === 1) {
		return s[0]!;
	}
	const totalLength = s.reduce((sum, arr) => sum + arr.length, 0) + sep.length * (s.length - 1);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (let i = 0; i < s.length; i++) {
		if (i > 0) {
			result.set(sep, offset);
			offset += sep.length;
		}
		result.set(s[i]!, offset);
		offset += s[i]!.length;
	}
	return result;
}

/**
 * Slices s into all subslices separated by sep and returns a slice of the subslices between those separators.
 * If sep is empty, split splits after each UTF-8 sequence.
 *
 * @param s - The byte slice to split
 * @param sep - The separator
 * @param n - Maximum number of splits (n > 0: at most n subslices; n == 0: empty result; n < 0: all subslices)
 * @returns An array of byte slices
 */
export function split(s: Uint8Array, sep: Uint8Array, n: number): Uint8Array[] {
	if (n === 0) {
		return [];
	}
	if (n === 1) {
		return [s];
	}
	if (sep.length === 0) {
		const str = new TextDecoder().decode(s);
		const parts = [];
		for (let i = 0; i < str.length; i++) {
			parts.push(new TextEncoder().encode(str[i]));
			if (n > 0 && parts.length >= n) {
				if (i + 1 < str.length) {
					parts[parts.length - 1] = new TextEncoder().encode(str.slice(i));
				}
				break;
			}
		}
		return parts;
	}
	const result: Uint8Array[] = [];
	let pos = 0;
	while (true) {
		const idx = index(s.subarray(pos), sep);
		if (idx < 0) {
			result.push(s.subarray(pos));
			break;
		}
		result.push(s.subarray(pos, pos + idx));
		pos += idx + sep.length;
		if (n > 0 && result.length >= n) {
			const last = result.pop()!;
			result.push(concat(last, s.subarray(pos - sep.length)));
			break;
		}
	}
	return result;
}

/**
 * Slices s into all subslices after each instance of sep and returns a slice of those subslices.
 * If sep is empty, splitAfter splits after each UTF-8 sequence.
 *
 * @param s - The byte slice to split
 * @param sep - The separator (included at end of each slice)
 * @param n - Maximum number of splits (n > 0: at most n subslices; n == 0: empty result; n < 0: all subslices)
 * @returns An array of byte slices
 */
export function splitAfter(s: Uint8Array, sep: Uint8Array, n: number): Uint8Array[] {
	if (n === 0) {
		return [];
	}
	if (n === 1) {
		return [s];
	}
	if (sep.length === 0) {
		const str = new TextDecoder().decode(s);
		const parts: Uint8Array[] = [];
		for (let i = 0; i < str.length; i++) {
			parts.push(new TextEncoder().encode(str[i]));
			if (n > 0 && parts.length >= n) {
				if (i + 1 < str.length) {
					parts[parts.length - 1] = new TextEncoder().encode(str.slice(i));
				}
				break;
			}
		}
		return parts;
	}
	const result: Uint8Array[] = [];
	let pos = 0;
	while (true) {
		const idx = index(s.subarray(pos), sep);
		if (idx < 0) {
			result.push(s.subarray(pos));
			break;
		}
		result.push(s.subarray(pos, pos + idx + sep.length));
		pos += idx + sep.length;
		if (n > 0 && result.length >= n) {
			const last = result.pop()!;
			result.push(concat(last, s.subarray(pos)));
			break;
		}
	}
	return result;
}

/**
 * Slices s into subslices after each instance of sep and returns a slice of those subslices.
 * This is an alias for splitAfter with explicit count parameter.
 *
 * @param s - The byte slice to split
 * @param sep - The separator (included at end of each slice)
 * @param n - Maximum number of splits
 * @returns An array of byte slices
 */
export function splitAfterN(s: Uint8Array, sep: Uint8Array, n: number): Uint8Array[] {
	return splitAfter(s, sep, n);
}

/**
 * Slices s into subslices separated by sep and returns a slice of the subslices between those separators.
 * This is an alias for split with explicit count parameter.
 *
 * @param s - The byte slice to split
 * @param sep - The separator
 * @param n - Maximum number of splits
 * @returns An array of byte slices
 */
export function splitN(s: Uint8Array, sep: Uint8Array, n: number): Uint8Array[] {
	return split(s, sep, n);
}

// Helper functions (assuming they are defined elsewhere)
function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
	const result = new Uint8Array(a.length + b.length);
	result.set(a, 0);
	result.set(b, a.length);
	return result;
}

function index(s: Uint8Array, sep: Uint8Array): number {
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

function hasPrefix(s: Uint8Array, prefix: Uint8Array): boolean {
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

function hasSuffix(s: Uint8Array, suffix: Uint8Array): boolean {
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
