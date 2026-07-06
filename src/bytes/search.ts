// compare returns an integer comparing two byte slices lexicographically.
// The result will be 0 if a==b, -1 if a < b, and +1 if a > b.
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

// clone returns a copy of the given byte slice.
export function clone(src: Uint8Array): Uint8Array {
	const dst = new Uint8Array(src.length);
	dst.set(src);
	return dst;
}

// contains reports whether subslice is within b.
export function contains(b: Uint8Array, subslice: Uint8Array): boolean {
	return index(b, subslice) >= 0;
}

// containsAny reports whether any of the UTF-8-encoded code points in chars are within b.
export function containsAny(b: Uint8Array, chars: string): boolean {
	const charBytes = new TextEncoder().encode(chars);
	for (const char of charBytes) {
		if (b.includes(char)) {
			return true;
		}
	}
	return false;
}

// count counts the number of non-overlapping instances of sep in s.
// If sep is an empty slice, count returns 1 + the number of UTF-8-encoded code points in s.
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

// equal reports whether a and b are the same length and contain the same bytes.
// A nil argument is equivalent to an empty slice.
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

// equalFold reports whether s and t, interpreted as UTF-8 strings, are equal under Unicode case-folding.
export function equalFold(s: Uint8Array, t: Uint8Array): boolean {
	const strS = new TextDecoder().decode(s).toLowerCase();
	const strT = new TextDecoder().decode(t).toLowerCase();
	return strS === strT;
}

// hasPrefix tests whether the byte slice s begins with prefix.
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

// hasSuffix tests whether the byte slice s ends with suffix.
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

// index returns the index of the first instance of sep in s, or -1 if sep is not present in s.
//
// Uses a first-byte scan + tail-verify strategy: native Uint8Array.indexOf drives the
// dominant rejection path through V8's SIMD/SWAR single-byte search, then the remainder
// of the needle is verified with a short-circuiting compare. This mirrors the approach
// production Go's bytes.Index takes. Worst case remains O(n*m) (e.g. a very common first
// byte with few full matches), but the constant is dramatically smaller than a nested loop.
export function index(s: Uint8Array, sep: Uint8Array): number {
	const m = sep.length;
	if (m === 0) {
		return 0;
	}
	if (m === 1) {
		return s.indexOf(sep[0]!);
	}
	if (m > s.length) {
		return -1;
	}
	const first = sep[0]!;
	const limit = s.length - m;
	let i = 0;
	while (true) {
		i = s.indexOf(first, i);
		if (i < 0 || i > limit) {
			return -1;
		}
		let match = true;
		for (let j = 1; j < m; j++) {
			if (s[i + j] !== sep[j]) {
				match = false;
				break;
			}
		}
		if (match) {
			return i;
		}
		i++;
	}
}

// indexAny interprets s as a sequence of UTF-8-encoded Unicode code points.
// It returns the byte index of the first occurrence in s of any of the Unicode code points in chars.
// It returns -1 if chars is empty or if there is no code point in common.
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

// indexByte returns the index of the first instance of c in s, or -1 if c is not present in s.
export function indexByte(s: Uint8Array, c: number): number {
	for (let i = 0; i < s.length; i++) {
		if (s[i] === c) {
			return i;
		}
	}
	return -1;
}

// indexFunc interprets s as a sequence of UTF-8-encoded code points.
// It returns the byte index in s of the first Unicode code point satisfying f(c), or -1 if none do.
export function indexFunc(s: Uint8Array, f: (r: number) => boolean): number {
	const str = new TextDecoder().decode(s);
	for (let i = 0; i < str.length; i++) {
		if (f(str.charCodeAt(i))) {
			return new TextEncoder().encode(str.slice(0, i)).length;
		}
	}
	return -1;
}

// indexRune interprets s as a sequence of UTF-8-encoded Unicode code points.
// It returns the byte index of the first occurrence in s of the given rune, or -1 if rune is not present in s.
export function indexRune(s: Uint8Array, r: number): number {
	const str = new TextDecoder().decode(s);
	const runeStr = String.fromCharCode(r);
	const index = str.indexOf(runeStr);
	if (index === -1) {
		return -1;
	}
	return new TextEncoder().encode(str.slice(0, index)).length;
}

// lastIndex returns the index of the last instance of sep in s, or -1 if sep is not present in s.
//
// Backward first-byte scan via native lastIndexOf + tail-verify (mirror of index()).
export function lastIndex(s: Uint8Array, sep: Uint8Array): number {
	const m = sep.length;
	if (m === 0) {
		return s.length;
	}
	if (m === 1) {
		return s.lastIndexOf(sep[0]!);
	}
	if (m > s.length) {
		return -1;
	}
	const first = sep[0]!;
	let i = s.length - m;
	while (true) {
		i = s.lastIndexOf(first, i);
		if (i < 0) {
			return -1;
		}
		let match = true;
		for (let j = 1; j < m; j++) {
			if (s[i + j] !== sep[j]) {
				match = false;
				break;
			}
		}
		if (match) {
			return i;
		}
		i--;
	}
}

// lastIndexAny interprets s as a sequence of UTF-8-encoded Unicode code points.
// It returns the byte index of the last occurrence in s of any of the Unicode code points in chars.
// It returns -1 if chars is empty or if there is no code point in common.
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

// lastIndexByte returns the index of the last instance of c in s, or -1 if c is not present in s.
export function lastIndexByte(s: Uint8Array, c: number): number {
	for (let i = s.length - 1; i >= 0; i--) {
		if (s[i] === c) {
			return i;
		}
	}
	return -1;
}

// lastIndexFunc interprets s as a sequence of UTF-8-encoded code points.
// It returns the byte index in s of the last Unicode code point satisfying f(c), or -1 if none do.
export function lastIndexFunc(s: Uint8Array, f: (r: number) => boolean): number {
	const str = new TextDecoder().decode(s);
	for (let i = str.length - 1; i >= 0; i--) {
		if (f(str.charCodeAt(i))) {
			return new TextEncoder().encode(str.slice(0, i)).length;
		}
	}
	return -1;
}
