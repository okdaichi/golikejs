// Baseline + regression benchmarks for bytes/* and sync/* primitives.
// Run: deno bench bench/
//
// These benchmarks are the perf-engineer baseline. They must be stable
// (CV well under ~5%) before any optimization delta is trusted.

import { Buffer } from "../src/bytes/buffer.ts";
import {
	compare,
	contains,
	count,
	equal,
	hasPrefix,
	hasSuffix,
	index,
	indexByte,
	lastIndex,
} from "../src/bytes/search.ts";
import { cut, fields, join, split } from "../src/bytes/split_join.ts";

// ---- Helpers to build deterministic fixtures (no Math.random at module load) ----
function asciiHaystack(n: number, needleEvery = 64): { hay: Uint8Array; sep: Uint8Array } {
	const hay = new Uint8Array(n);
	for (let i = 0; i < n; i++) hay[i] = (i * 31 + 7) % 251; // pseudo-random-ish bytes
	const sep = new Uint8Array(8);
	for (let i = 0; i < 8; i++) sep[i] = (i * 17 + 3) % 251;
	// plant the needle near the end so search isn't trivially early
	const pos = n - n % needleEvery - sep.length;
	if (pos >= 0 && pos + sep.length <= n) hay.set(sep, pos);
	return { hay, sep };
}

const { hay: BIG, sep: SEPMULTI } = asciiHaystack(64 * 1024);
const SEPSINGLE = new Uint8Array([SEPMULTI[0]! < 0xff ? SEPMULTI[0]! + 1 : SEPMULTI[0]!]);
// plant single byte too
BIG[BIG.length - 1] = SEPSINGLE[0]!;

const A = new Uint8Array(1024);
const B = new Uint8Array(1024);
for (let i = 0; i < 1024; i++) {
	A[i] = i & 0xff;
	B[i] = i & 0xff;
}
B[1023] = (B[1023]! + 1) & 0xff; // differ at last byte

const FIELDS_INPUT = new TextEncoder().encode("alpha beta gamma delta epsilon zeta".repeat(50));

// ---------------- bytes/search ----------------

Deno.bench(
	"index (multi-byte needle, 64KiB haystack)",
	{ group: "index", baseline: true },
	() => {
		index(BIG, SEPMULTI);
	},
);

Deno.bench(
	"contains (multi-byte needle, 64KiB haystack)",
	{ group: "contains", baseline: true },
	() => {
		contains(BIG, SEPMULTI);
	},
);

Deno.bench(
	"indexByte (64KiB haystack)",
	{ group: "indexByte", baseline: true },
	() => {
		indexByte(BIG, SEPSINGLE[0]!);
	},
);

Deno.bench(
	"count (multi-byte needle, 64KiB haystack)",
	{ group: "count", baseline: true },
	() => {
		count(BIG, SEPMULTI);
	},
);

Deno.bench(
	"lastIndex (multi-byte needle, 64KiB haystack)",
	{ group: "lastIndex", baseline: true },
	() => {
		lastIndex(BIG, SEPMULTI);
	},
);

Deno.bench("equal (1KiB, differ at last byte)", { group: "equal", baseline: true }, () => {
	equal(A, B);
});

Deno.bench("compare (1KiB)", { group: "compare", baseline: true }, () => {
	compare(A, B);
});

Deno.bench("hasPrefix (1KiB prefix)", { group: "hasPrefix", baseline: true }, () => {
	hasPrefix(A, A.subarray(0, 1024));
});

Deno.bench("hasSuffix (1KiB suffix)", { group: "hasSuffix", baseline: true }, () => {
	hasSuffix(A, A.subarray(0, 1024));
});

// ---------------- bytes/split_join ----------------

Deno.bench("cut (multi-byte sep)", { group: "cut", baseline: true }, () => {
	cut(BIG, SEPMULTI);
});

Deno.bench("split (multi-byte sep, n=-1)", { group: "split", baseline: true }, () => {
	split(BIG, SEPMULTI, -1);
});

Deno.bench(
	"fields (whitespace split, 1.7KiB ascii)",
	{ group: "fields", baseline: true },
	() => {
		fields(FIELDS_INPUT);
	},
);

const JOIN_PARTS = split(BIG.subarray(0, 4096), SEPMULTI, -1);
Deno.bench("join (350 parts)", { group: "join", baseline: true }, () => {
	join(JOIN_PARTS, SEPMULTI);
});

// ---------------- bytes/Buffer ----------------

Deno.bench(
	"Buffer.write (512B into 512-cap, no grow)",
	{ group: "Buffer.write", baseline: true },
	() => {
		const buf = Buffer.make(512);
		buf.write(A.subarray(0, 512));
	},
);

Deno.bench(
	"Buffer.writeByte x256",
	{ group: "Buffer.writeByte", baseline: true },
	() => {
		const buf = Buffer.make(256);
		for (let i = 0; i < 256; i++) buf.writeByte(i);
	},
);

Deno.bench(
	"Buffer.grow path (256 writes of 64B triggering reallocs)",
	{ group: "Buffer.grow", baseline: true },
	() => {
		const buf = Buffer.make(64);
		const chunk = A.subarray(0, 64);
		for (let i = 0; i < 256; i++) buf.write(chunk);
	},
);

Deno.bench(
	"Buffer.read (512B out)",
	{ group: "Buffer.read", baseline: true },
	() => {
		const buf = Buffer.make(512);
		buf.write(A.subarray(0, 512));
		const out = new Uint8Array(512);
		buf.read(out);
	},
);
