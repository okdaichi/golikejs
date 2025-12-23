/**
 * Synchronization primitives for concurrent programs.
 *
 * This sub-module implements common synchronization primitives inspired by
 * Go's `sync` package. They are designed for coordinating async/await-based
 * code and provide tools like mutexes, read-write locks, wait groups and
 * semaphores.
 *
 * Exported highlights:
 * - {@link Mutex} - exclusive lock for simple mutual exclusion
 * - {@link RWMutex} - reader/writer lock allowing concurrent readers
 * - {@link WaitGroup} - wait for a collection of operations to finish
 * - {@link Semaphore} - counting semaphore for resource permits
 * - {@link Cond} (from `cond.ts`) - conditional variable helpers
 * - {@link Once} - ensures a function is executed exactly once
 *
 * Example
 * ```ts
 * import { sync } from "@okdaichi/golikejs";
 * const mu = new sync.Mutex();
 * await mu.lock();
 * try {
 *   // critical section
 * } finally {
 *   mu.unlock();
 * }
 * ```
 *
 * @module @okdaichi/golikejs/sync
 */

export * from "./mutex.ts";
export * from "./rwmutex.ts";
export * from "./waitgroup.ts";
export * from "./semaphore.ts";
export * from "./cond.ts";
export * from "./once.ts";
