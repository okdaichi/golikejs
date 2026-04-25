import { Channel, default_, receive, select, send } from "./channel.ts";
import { assertEquals } from "@std/assert";

Deno.test("Channel - basic send and receive", async () => {
	const ch = new Channel<number>();
	const results: number[] = [];

	const p1 = (async () => {
		const [val, ok] = await ch.receive();
		if (ok) results.push(val);
	})();

	await ch.send(100);
	await p1;

	assertEquals(results, [100]);
});

Deno.test("Channel - buffered channel", async () => {
	const ch = new Channel<number>(2);
	await ch.send(1);
	await ch.send(2);

	assertEquals(ch.length, 2);

	const [v1, ok1] = await ch.receive();
	const [v2, ok2] = await ch.receive();

	assertEquals([v1, ok1], [1, true]);
	assertEquals([v2, ok2], [2, true]);
	assertEquals(ch.length, 0);
});

Deno.test("Channel - close", async () => {
	const ch = new Channel<number>(1);
	await ch.send(1);
	ch.close();

	const [v1, ok1] = await ch.receive();
	assertEquals([v1, ok1], [1, true]);

	const [v2, ok2] = await ch.receive();
	assertEquals([v2, ok2], [undefined, false]);
});

Deno.test("Channel - async iterator", async () => {
	const ch = new Channel<number>(3);
	await ch.send(1);
	await ch.send(2);
	await ch.send(3);
	ch.close();

	const results: number[] = [];
	for await (const val of ch) {
		results.push(val);
	}

	assertEquals(results, [1, 2, 3]);
});

Deno.test("Channel - directional types", async () => {
	const ch = new Channel<number>(1);

	const sendOnly = (c: import("./channel.ts").SendChan<number>) => {
		return c.send(42);
	};

	const receiveOnly = async (c: import("./channel.ts").ReceiveChan<number>) => {
		const [val, ok] = await c.receive();
		return val;
	};

	await sendOnly(ch);
	const val = await receiveOnly(ch);
	assertEquals(val, 42);
});

Deno.test("Channel - from array", async () => {
	const ch = Channel.from([1, 2, 3]);
	const results: number[] = [];
	for await (const val of ch) {
		results.push(val);
	}
	assertEquals(results, [1, 2, 3]);
});

Deno.test("Channel - select", async () => {
	const ch1 = new Channel<number>();
	const ch2 = new Channel<number>();
	const results: string[] = [];

	const p1 = ch1.send(1);

	await select([
		receive(ch1).then((val) => results.push(`ch1:${val}`)),
		receive(ch2).then((val) => results.push(`ch2:${val}`)),
	]);

	await p1;
	assertEquals(results, ["ch1:1"]);
});

Deno.test("Channel - select default", async () => {
	const ch1 = new Channel<number>();
	let called = false;

	await select([
		receive(ch1).then(() => {}),
		default_(() => {
			called = true;
		}),
	]);

	assertEquals(called, true);
});

Deno.test("Channel - select no value loss", async () => {
	const ch1 = new Channel<number>();
	const ch2 = new Channel<number>();

	// Start a select that waits on both
	const p = select([
		receive(ch1).then(() => "ch1"),
		receive(ch2).then(() => "ch2"),
	]);

	// Send to ch2, it should be picked
	await ch2.send(2);
	await p;

	// Now send to ch1, it should NOT be consumed by the already finished select
	const pSend = ch1.send(1);

	// Try to receive from ch1, it should get 1
	const [val, ok] = await ch1.receive();
	await pSend;
	assertEquals([val, ok], [1, true]);
});
