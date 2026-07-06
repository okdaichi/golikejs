// Benchmarks for bytes/Buffer. Run: deno bench
// Co-located with source (Go-style). Not collected by `deno test`.

import { Buffer } from "./buffer.ts";

const A = new Uint8Array(1024);
for (let i = 0; i < 1024; i++) A[i] = i & 0xff;

Deno.bench(
	"Buffer.write (512B into 512-cap, no grow)",
	{ group: "Buffer.write", baseline: true },
	() => {
		const buf = Buffer.make(512);
		buf.write(A.subarray(0, 512));
	},
);

Deno.bench("Buffer.writeByte x256", { group: "Buffer.writeByte", baseline: true }, () => {
	const buf = Buffer.make(256);
	for (let i = 0; i < 256; i++) buf.writeByte(i);
});

Deno.bench(
	"Buffer.grow path (256 writes of 64B triggering reallocs)",
	{ group: "Buffer.grow", baseline: true },
	() => {
		const buf = Buffer.make(64);
		const chunk = A.subarray(0, 64);
		for (let i = 0; i < 256; i++) buf.write(chunk);
	},
);

Deno.bench("Buffer.read (512B out)", { group: "Buffer.read", baseline: true }, () => {
	const buf = Buffer.make(512);
	buf.write(A.subarray(0, 512));
	const out = new Uint8Array(512);
	buf.read(out);
});
