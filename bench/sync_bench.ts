// Baseline + regression benchmarks for sync/* primitives.
import { Mutex } from "../src/sync/mutex.ts";
import { RWMutex } from "../src/sync/rwmutex.ts";
import { Semaphore } from "../src/sync/semaphore.ts";
import { Once } from "../src/sync/once.ts";
import { WaitGroup } from "../src/sync/waitgroup.ts";

Deno.bench(
	"Mutex uncontended lock/unlock (1k)",
	{ group: "mutex-uncontended", baseline: true },
	async () => {
		const m = new Mutex();
		for (let i = 0; i < 1000; i++) {
			await m.lock();
			m.unlock();
		}
	},
);

Deno.bench(
	"RWMutex uncontended rlock/runlock (1k)",
	{ group: "rwmutex-read", baseline: true },
	async () => {
		const m = new RWMutex();
		for (let i = 0; i < 1000; i++) {
			await m.rlock();
			m.runlock();
		}
	},
);

Deno.bench(
	"RWMutex uncontended wlock/unlock (1k)",
	{ group: "rwmutex-write", baseline: true },
	async () => {
		const m = new RWMutex();
		for (let i = 0; i < 1000; i++) {
			await m.lock();
			m.unlock();
		}
	},
);

Deno.bench(
	"Semaphore(1) acquire/release (1k)",
	{ group: "semaphore", baseline: true },
	async () => {
		const s = new Semaphore(1);
		for (let i = 0; i < 1000; i++) {
			await s.acquire();
			s.release();
		}
	},
);

Deno.bench(
	"Once.do (1k, already-done fast path)",
	{ group: "once", baseline: true },
	() => {
		const o = new Once();
		o.do(() => {});
		for (let i = 0; i < 1000; i++) o.do(() => {});
	},
);

Deno.bench(
	"WaitGroup add/done (1k)",
	{ group: "waitgroup", baseline: true },
	() => {
		const wg = new WaitGroup();
		wg.add(1000);
		for (let i = 0; i < 1000; i++) wg.done();
	},
);
