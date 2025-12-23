# context

Context utilities for cancellation and timeouts.

## Contents

- [Constants](#constants)
- [Types](#types)
- [Functions](#functions)

## Constants

None

## Types

### CancelCauseFunc

```ts
type CancelCauseFunc = (err: Error | undefined) => void;
```

### CancelFunc

```ts
type CancelFunc = () => void;
```

### Context

```ts
interface Context {
	done(): Promise<void>;
	err(): Error | undefined;
}
```

### function background

```ts
function background(): Context;
```

Returns a background/root Context that never times out on its own.

### function watchPromise

```ts
function watchPromise<T>(parent: Context, promise: Promise<T>): Context;
```

Returns a Context derived from parent which will be cancelled when the promise settles.

### function watchSignal

```ts
function watchSignal(parent: Context, signal: AbortSignal): Context;
```

Returns a Context derived from parent which will be cancelled when the signal aborts.

### function withAbort

```ts
function withAbort(parent: Context): [Context, AbortController];
```

Returns a new child Context and an AbortController paired to it.

### function withCancel

```ts
function withCancel(parent: Context): [Context, CancelFunc];
```

Returns a new child Context and a cancel function.

### function withCancelCause

```ts
function withCancelCause(parent: Context): [Context, CancelCauseFunc];
```

Returns a new child Context and a cancel function that accepts an error cause.

### function withTimeout

```ts
function withTimeout(parent: Context, timeoutMs: number): Context;
```

Returns a child Context that cancels after the specified timeout.

### ContextCancelledError

```ts
class ContextCancelledError extends Error
```

```ts
constructor(message?: string)
```

### ContextTimeoutError

```ts
class ContextTimeoutError extends Error
```

```ts
constructor(message?: string)
```

## Functions

### afterFunc

```ts
function afterFunc(parent: Context, fn: () => void | Promise<void>): () => boolean;
```

Returns a function that can be called to stop the execution of fn when the parent context finishes.

### toAbortSignal

```ts
function toAbortSignal(ctx: Context): AbortSignal;
```

Converts a Context into an AbortSignal for integration with fetch / Web APIs.
