// Benchmarks for bytes/search. Run: deno bench
// Co-located with source (Go-style). Not collected by `deno test`.

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
} from "./search.ts";

// deterministic fixture (no Math.random at module load)
function asciiHaystack(n: number, needleEvery = 64): { hay: Uint8Array; sep: Uint8Array } {
	const hay = new Uint8Array(n);
	for (let i = 0; i < n; i++) hay[i] = (i * 31 + 7) % 251;
	const sep = new Uint8Array(8);
	for (let i = 0; i < 8; i++) sep[i] = (i * 17 + 3) % 251;
	const pos = n - n % needleEvery - sep.length; // plant near the end
	if (pos >= 0 && pos + sep.length <= n) hay.set(sep, pos);
	return { hay, sep };
}

const { hay: BIG, sep: SEPMULTI } = asciiHaystack(64 * 1024);
const SEPSINGLE = new Uint8Array([SEPMULTI[0]! < 0xff ? SEPMULTI[0]! + 1 : SEPMULTI[0]!]);
BIG[BIG.length - 1] = SEPSINGLE[0]!;

const A = new Uint8Array(1024);
const B = new Uint8Array(1024);
for (let i = 0; i < 1024; i++) {
	A[i] = i & 0xff;
	B[i] = i & 0xff;
}
B[1023] = (B[1023]! + 1) & 0xff;

Deno.bench("index (multi-byte needle, 64KiB haystack)", { group: "index", baseline: true }, () => {
	index(BIG, SEPMULTI);
});

Deno.bench(
	"contains (multi-byte needle, 64KiB haystack)",
	{ group: "contains", baseline: true },
	() => {
		contains(BIG, SEPMULTI);
	},
);

Deno.bench("indexByte (64KiB haystack)", { group: "indexByte", baseline: true }, () => {
	indexByte(BIG, SEPSINGLE[0]!);
});

Deno.bench("count (multi-byte needle, 64KiB haystack)", { group: "count", baseline: true }, () => {
	count(BIG, SEPMULTI);
});

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
