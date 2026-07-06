// Benchmarks for channel.ts. Run: deno bench
// Co-located (Go-style). Not collected by `deno test`.
import { Channel, default_, receive, select } from "./channel.ts";

Deno.bench(
	"unbuffered — 1k send/recv rendezvous",
	{ group: "unbuffered", baseline: true },
	async () => {
		const ch = new Channel<number>(0);
		const sender = (async () => {
			for (let i = 0; i < 1000; i++) await ch.send(i);
			ch.close();
		})();
		let sum = 0;
		for await (const v of ch) sum += v;
		await sender;
	},
);

Deno.bench(
	"buffered cap=64 — 1k send/recv",
	{ group: "buffered", baseline: true },
	async () => {
		const ch = new Channel<number>(64);
		const sender = (async () => {
			for (let i = 0; i < 1000; i++) await ch.send(i);
			ch.close();
		})();
		let sum = 0;
		for await (const v of ch) sum += v;
		await sender;
	},
);

// Hot non-blocking poll: select with a default case, no op ever ready.
// Exercises the fairness shuffle + immediate-ready scan on every call.
Deno.bench(
	"select w/ default — 1k polls (nothing ready)",
	{ group: "select-default", baseline: true },
	async () => {
		const ch = new Channel<number>(0);
		for (let i = 0; i < 1000; i++) {
			await select([
				receive(ch).then(() => {}),
				default_(() => {}),
			]);
		}
	},
);

// Blocking select over 2 channels where exactly one has data each iteration.
Deno.bench(
	"select 2 chans — 1k ready receives",
	{ group: "select-2chan", baseline: true },
	async () => {
		const a = new Channel<number>(1);
		const b = new Channel<number>(1);
		let picked = 0;
		for (let i = 0; i < 1000; i++) {
			await a.send(i);
			await select([
				receive(a).then(() => {
					picked++;
				}),
				receive(b).then(() => {}),
			]);
		}
	},
);
