// cut slices s around the first instance of sep, returning the text before and after sep.
// The found result reports whether sep appears in s.
// If sep does not appear in s, cut returns s, empty slice, and false.
export function cut(s: Uint8Array, sep: Uint8Array): [Uint8Array, Uint8Array, boolean] {
	const idx = index(s, sep);
	if (idx < 0) {
		return [s, new Uint8Array(0), false];
	}
	return [s.subarray(0, idx), s.subarray(idx + sep.length), true];
}

// cutPrefix returns s without the provided leading prefix slice and reports whether it found the prefix.
// If s doesn't start with prefix, cutPrefix returns s, false.
// If prefix is empty, cutPrefix returns s, true.
export function cutPrefix(s: Uint8Array, prefix: Uint8Array): [Uint8Array, boolean] {
	if (prefix.length === 0) {
		return [s, true];
	}
	if (hasPrefix(s, prefix)) {
		return [s.subarray(prefix.length), true];
	}
	return [s, false];
}

// cutSuffix returns s without the provided ending suffix slice and reports whether it found the suffix.
// If s doesn't end with suffix, cutSuffix returns s, false.
// If suffix is empty, cutSuffix returns s, true.
export function cutSuffix(s: Uint8Array, suffix: Uint8Array): [Uint8Array, boolean] {
	if (suffix.length === 0) {
		return [s, true];
	}
	if (hasSuffix(s, suffix)) {
		return [s.subarray(0, s.length - suffix.length), true];
	}
	return [s, false];
}

// fields interprets s as a sequence of UTF-8-encoded code points.
// It splits the slice s around each instance of one or more consecutive white space
// characters, as defined by unicode.IsSpace, returning a slice of subslices of s
// or an empty slice if s contains only white space.
//
// ASCII fast path: when every byte is ASCII, scan once and return subslices of s
// (zero-copy, like Go's bytes.Fields). When a non-ASCII byte is encountered, fall
// back to the /\s/-based path so Unicode whitespace semantics are unchanged. The
// returned subslices alias the input s; callers that need independent memory should
// copy (e.g. .slice()).
export function fields(s: Uint8Array): Uint8Array[] {
	const result: Uint8Array[] = [];
	let start = -1;
	for (let i = 0; i < s.length; i++) {
		const b = s[i]!;
		if (b >= 0x80) {
			// Non-ASCII present: defer to the Unicode-aware path (unchanged semantics).
			return fieldsUnicode(s);
		}
		if (b === 0x20 || (b >= 0x09 && b <= 0x0d)) {
			// ASCII whitespace (\t \n \v \f \r space)
			if (start >= 0) {
				result.push(s.subarray(start, i));
				start = -1;
			}
		} else if (start < 0) {
			start = i;
		}
	}
	if (start >= 0) result.push(s.subarray(start));
	return result;
}

// Unicode-aware fields: decode and split on /\s+/. Returns independent copies.
function fieldsUnicode(s: Uint8Array): Uint8Array[] {
	const str = new TextDecoder().decode(s);
	const parts = str.split(/\s+/).filter((f) => f.length > 0);
	return parts.map((f) => new TextEncoder().encode(f));
}

// fieldsFunc interprets s as a sequence of UTF-8-encoded code points.
// It splits the slice s into subslices according to the predicate f.
// The subslices do not overlap and do not share underlying memory.
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

// join concatenates the elements of s to create a new byte slice. The separator sep is placed between elements in the result.
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

// split slices s into all subslices separated by sep and returns a slice of the subslices between those separators.
// If sep is empty, split splits after each UTF-8 sequence.
// The count determines the number of subslices to return:
//   n > 0: at most n subslices; the last subslice will be the unsplit remainder.
//   n == 0: the result is nil (zero subslices)
//   n < 0: all subslices
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

// splitAfter slices s into all subslices after each instance of sep and returns a slice of those subslices.
// If sep is empty, splitAfter splits after each UTF-8 sequence.
// The count determines the number of subslices to return:
//   n > 0: at most n subslices; the last subslice will be the unsplit remainder.
//   n == 0: the result is nil (zero subslices)
//   n < 0: all subslices
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

// splitAfterN slices s into subslices after each instance of sep and returns a slice of those subslices.
// If sep is empty, splitAfterN splits after each UTF-8 sequence.
// The count determines the number of subslices to return:
//   n > 0: at most n subslices; the last subslice will be the unsplit remainder.
//   n == 0: the result is nil (zero subslices)
//   n < 0: all subslices
export function splitAfterN(s: Uint8Array, sep: Uint8Array, n: number): Uint8Array[] {
	return splitAfter(s, sep, n);
}

// splitN slices s into subslices separated by sep and returns a slice of the subslices between those separators.
// If sep is empty, splitN splits after each UTF-8 sequence.
// The count determines the number of subslices to return:
//   n > 0: at most n subslices; the last subslice will be the unsplit remainder.
//   n == 0: the result is nil (zero subslices)
//   n < 0: all subslices
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

// First-byte scan + tail-verify (see src/bytes/search.ts index for rationale).
function index(s: Uint8Array, sep: Uint8Array): number {
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
