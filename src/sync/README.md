# sync

Synchronization primitives for concurrent programs.

## Contents

- [Constants](#constants)
- [Types](#types)
- [Functions](#functions)

## Constants

None

## Types

### Cond

```ts
class Cond {
    waitersCount: number;
    constructor(mutex: Mutex);
}
```

### function (Cond).broadcast

```ts
broadcast(): void
```

Wakes all waiting operations.

### function (Cond).signal

```ts
signal(): void
```

Wakes one waiting operation, if any.

### function (Cond).wait

```ts
wait(): Promise<void>
```

Atomically unlocks the mutex and suspends execution until awakened by Signal or Broadcast.

### function (Cond).waitersCount

```ts
waitersCount: number
```

Gets the number of waiting operations.

### Mutex

```ts
class Mutex {
    locked: boolean;
}
```

### function (Mutex).lock

```ts
lock(): Promise<void>
```

Acquires the lock.

### function (Mutex).locked

```ts
locked: boolean
```

Checks if the mutex is currently locked.

### function (Mutex).tryLock

```ts
tryLock(): boolean
```

Tries to acquire the lock without waiting.

### function (Mutex).unlock

```ts
unlock(): void
```

Releases the lock.

### RWMutex

```ts
class RWMutex {
    constructor();
}
```

### function (RWMutex).lock

```ts
lock(): Promise<void>
```

Acquires the write lock.

### function (RWMutex).readCount

```ts
readCount: number
```

Gets the current read count.

### function (RWMutex).rlock

```ts
rlock(): Promise<void>
```

Acquires a read lock.

### function (RWMutex).runlock

```ts
runlock(): void
```

Releases a read lock.

### function (RWMutex).tryLock

```ts
tryLock(): boolean
```

Tries to acquire the write lock without waiting.

### function (RWMutex).tryRLock

```ts
tryRLock(): boolean
```

Tries to acquire a read lock without waiting.

### function (RWMutex).unlock

```ts
unlock(): void
```

Releases the write lock.

### function (RWMutex).writeLocked

```ts
writeLocked: boolean
```

Checks if write locked.

### Semaphore

```ts
class Semaphore {
    constructor(permits: number);
}
```

### function (Semaphore).acquire

```ts
acquire(): Promise<void>
```

Acquires a permit.

### function (Semaphore).availablePermits

```ts
availablePermits: number
```

Gets the available permits count.

### function (Semaphore).queueLength

```ts
queueLength: number
```

Gets the number of waiting operations.

### function (Semaphore).release

```ts
release(): void
```

Releases a permit.

### function (Semaphore).tryAcquire

```ts
tryAcquire(): boolean
```

Tries to acquire a permit without waiting.

### WaitGroup

```ts
class WaitGroup {
    constructor();
}
```

### function (WaitGroup).add

```ts
add(delta: number): void
```

Adds delta to the .

### function (WaitGroup).counter

```ts
counter: number
```

Gets the current counter value.

### function (WaitGroup).done

```ts
done(): void
```

Decrements the counter by one.

### function (WaitGroup).go

```ts
go(fn: () => Promise<void> | void): Promise<void>
```

Executes an async function and manages the counter.

### function (WaitGroup).wait

```ts
wait(): Promise<void>
```

Waits until the counter is zero.

### Once

```ts
class Once {
    constructor();
}
```

Once is an object that will perform exactly one action.

### function (Once).do

```ts
do<T>(f: () => T | Promise<T>): Promise<T>
```

Calls the function f if and only if do is being called for the first time for this instance of Once. If f throws an error, do considers it to have completed; future calls of do return without calling f.

## Functions

None