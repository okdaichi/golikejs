// Benchmarks for bytes/split_join. Run: deno bench
// Co-located with source (Go-style). Not collected by `deno test`.

import { cut, fields, join, split } from "./split_join.ts";

// deterministic fixture (no Math.random at module load)
function asciiHaystack(n: number, needleEvery = 64): { hay: Uint8Array; sep: Uint8Array } {
	const hay = new Uint8Array(n);
	for (let i = 0; i < n; i++) hay[i] = (i * 31 + 7) % 251;
	const sep = new Uint8Array(8);
	for (let i = 0; i < 8; i++) sep[i] = (i * 17 + 3) % 251;
	const pos = n - n % needleEvery - sep.length;
	if (pos >= 0 && pos + sep.length <= n) hay.set(sep, pos);
	return { hay, sep };
}

const { hay: BIG, sep: SEPMULTI } = asciiHaystack(64 * 1024);
const FIELDS_INPUT = new TextEncoder().encode("alpha beta gamma delta epsilon zeta".repeat(50));
const JOIN_PARTS = split(BIG.subarray(0, 4096), SEPMULTI, -1);

Deno.bench("cut (multi-byte sep)", { group: "cut", baseline: true }, () => {
	cut(BIG, SEPMULTI);
});

Deno.bench("split (multi-byte sep, n=-1)", { group: "split", baseline: true }, () => {
	split(BIG, SEPMULTI, -1);
});

Deno.bench("fields (whitespace split, 1.7KiB ascii)", { group: "fields", baseline: true }, () => {
	fields(FIELDS_INPUT);
});

Deno.bench("join (350 parts)", { group: "join", baseline: true }, () => {
	join(JOIN_PARTS, SEPMULTI);
});
