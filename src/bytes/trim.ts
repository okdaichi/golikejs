/**
 * @module
 * Functions for trimming byte slices.
 */

/**
 * Returns a subslice of s by slicing off all leading and trailing UTF-8-encoded code points contained in cutset.
 *
 * @param s - The byte slice to trim
 * @param cutset - Byte slice containing characters to remove
 * @returns A trimmed byte slice
 */
export function trim(s: Uint8Array, cutset: Uint8Array): Uint8Array {
	let start = 0;
	let end = s.length;

	// Create a set of cutset bytes for fast lookup
	const cutsetSet = new Set(cutset);

	// Trim from start
	while (start < end && cutsetSet.has(s[start]!)) {
		start++;
	}

	// Trim from end
	while (end > start && cutsetSet.has(s[end - 1]!)) {
		end--;
	}

	return s.subarray(start, end);
}

/**
 * Returns a subslice of s by slicing off all leading and trailing Unicode code points c satisfying f(c).
 *
 * @param s - The byte slice to trim
 * @param f - Predicate function to test each code point
 * @returns A trimmed byte slice
 */
export function trimFunc(s: Uint8Array, f: (r: number) => boolean): Uint8Array {
	const str = new TextDecoder().decode(s);
	let start = 0;
	let end = str.length;
	while (start < end && f(str.charCodeAt(start))) {
		start++;
	}
	while (end > start && f(str.charCodeAt(end - 1))) {
		end--;
	}
	return new TextEncoder().encode(str.slice(start, end));
}

/**
 * Returns a subslice of s by slicing off all leading UTF-8-encoded code points contained in cutset.
 *
 * @param s - The byte slice to trim
 * @param cutset - Byte slice containing characters to remove from the left
 * @returns A left-trimmed byte slice
 */
export function trimLeft(s: Uint8Array, cutset: Uint8Array): Uint8Array {
	let start = 0;
	const cutsetSet = new Set(cutset);

	while (start < s.length && cutsetSet.has(s[start]!)) {
		start++;
	}

	return s.subarray(start);
}

/**
 * Returns a subslice of s by slicing off all leading Unicode code points c satisfying f(c).
 *
 * @param s - The byte slice to trim
 * @param f - Predicate function to test each code point
 * @returns A left-trimmed byte slice
 */
export function trimLeftFunc(s: Uint8Array, f: (r: number) => boolean): Uint8Array {
	const str = new TextDecoder().decode(s);
	let start = 0;
	while (start < str.length && f(str.charCodeAt(start))) {
		start++;
	}
	return new TextEncoder().encode(str.slice(start));
}

/**
 * Returns s without the provided leading prefix slice.
 * If s doesn't start with prefix, returns s unchanged.
 *
 * @param s - The byte slice to trim
 * @param prefix - The prefix to remove
 * @returns A byte slice without the prefix
 */
export function trimPrefix(s: Uint8Array, prefix: Uint8Array): Uint8Array {
	if (hasPrefix(s, prefix)) {
		return s.subarray(prefix.length);
	}
	return s;
}

/**
 * Returns a subslice of s by slicing off all trailing UTF-8-encoded code points contained in cutset.
 *
 * @param s - The byte slice to trim
 * @param cutset - Byte slice containing characters to remove from the right
 * @returns A right-trimmed byte slice
 */
export function trimRight(s: Uint8Array, cutset: Uint8Array): Uint8Array {
	let end = s.length;
	const cutsetSet = new Set(cutset);

	while (end > 0 && cutsetSet.has(s[end - 1]!)) {
		end--;
	}

	return s.subarray(0, end);
}

/**
 * Returns a subslice of s by slicing off all trailing Unicode code points c satisfying f(c).
 *
 * @param s - The byte slice to trim
 * @param f - Predicate function to test each code point
 * @returns A right-trimmed byte slice
 */
export function trimRightFunc(s: Uint8Array, f: (r: number) => boolean): Uint8Array {
	const str = new TextDecoder().decode(s);
	let end = str.length;
	while (end > 0 && f(str.charCodeAt(end - 1))) {
		end--;
	}
	return new TextEncoder().encode(str.slice(0, end));
}

/**
 * Returns a subslice of s by slicing off all leading and trailing white space, as defined by Unicode.
 *
 * @param s - The byte slice to trim
 * @returns A byte slice with whitespace removed from both ends
 */
export function trimSpace(s: Uint8Array): Uint8Array {
	const str = new TextDecoder().decode(s);
	const trimmed = str.trim();
	return new TextEncoder().encode(trimmed);
}

/**
 * Returns s without the provided ending suffix slice.
 * If s doesn't end with suffix, returns s unchanged.
 *
 * @param s - The byte slice to trim
 * @param suffix - The suffix to remove
 * @returns A byte slice without the suffix
 */
export function trimSuffix(s: Uint8Array, suffix: Uint8Array): Uint8Array {
	if (hasSuffix(s, suffix)) {
		return s.subarray(0, s.length - suffix.length);
	}
	return s;
}

// Helper functions
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
