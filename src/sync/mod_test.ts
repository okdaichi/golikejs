import { Cond, Mutex, Once, RWMutex, Semaphore, WaitGroup } from "./mod.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test("golikejs package - should export all synchronization primitives", () => {
	assert(Mutex !== undefined);
	assert(RWMutex !== undefined);
	assert(WaitGroup !== undefined);
	assert(Semaphore !== undefined);
	assert(Cond !== undefined);
	assert(Once !== undefined);
});

Deno.test("golikejs package - should create instances of all primitives", () => {
	const mutex = new Mutex();
	const rwmutex = new RWMutex();
	const wg = new WaitGroup();
	const sem = new Semaphore(1);
	const cond = new Cond(mutex);
	const once = new Once();

	assert(mutex instanceof Mutex);
	assert(rwmutex instanceof RWMutex);
	assert(wg instanceof WaitGroup);
	assert(sem instanceof Semaphore);
	assert(cond instanceof Cond);
	assert(once instanceof Once);
});

Deno.test("golikejs package - should work together in a realistic scenario", async () => {
	const mutex = new Mutex();
	const wg = new WaitGroup();
	const results: number[] = [];

	// Simulate concurrent workers with shared state
	const numWorkers = 3;
	wg.add(numWorkers);

	const workers = Array.from({ length: numWorkers }, (_, id) =>
		(async (workerId: number) => {
			for (let i = 0; i < 3; i++) {
				await mutex.lock();

				// Critical section - modify shared state
				const current = results.length;
				await new Promise((resolve) => setTimeout(resolve, 1)); // Simulate work
				results.push(workerId * 100 + i);

				mutex.unlock();

				// Non-critical work
				await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
			}
			wg.done();
		})(id));

	// Wait for all workers to complete
	await wg.wait();

	assertEquals(results.length, 9); // 3 workers * 3 items each

	// Verify each worker contributed
	const worker0Results = results.filter((x) => Math.floor(x / 100) === 0);
	const worker1Results = results.filter((x) => Math.floor(x / 100) === 1);
	const worker2Results = results.filter((x) => Math.floor(x / 100) === 2);

	assertEquals(worker0Results.length, 3);
	assertEquals(worker1Results.length, 3);
	assertEquals(worker2Results.length, 3);
});

Deno.test("golikejs package - Once and WaitGroup integration", async () => {
	const once = new Once();
	const wg = new WaitGroup();
	let initCount = 0;
	const results: number[] = [];

	const init = async () => {
		initCount++;
		await new Promise((resolve) => setTimeout(resolve, 10));
		return 42;
	};

	// Multiple workers all trying to initialize
	const numWorkers = 5;
	wg.add(numWorkers);

	for (let i = 0; i < numWorkers; i++) {
		(async () => {
			const value = await once.do(init);
			results.push(value);
			wg.done();
		})();
	}

	await wg.wait();

	// Init should have been called exactly once
	assertEquals(initCount, 1);
	// But all workers should have the result
	assertEquals(results.length, 5);
	assertEquals(results, [42, 42, 42, 42, 42]);
});
