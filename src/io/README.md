# io

I/O primitives and small helpers.

## Contents

- [Constants](#constants)
- [Types](#types)
- [Functions](#functions)

## Constants

None

## Types

### Closer

```ts
interface Closer {
	close(): Promise<Error | undefined>;
}
```

### EOFError

```ts
class EOFError extends Error {
	constructor();
}
```

### Reader

```ts
interface Reader {
	read(p: Uint8Array): Promise<[number, Error | undefined]>;
}
```

### ReaderFrom

```ts
interface ReaderFrom {
	readFrom(r: Reader): Promise<[number, Error | undefined]>;
}
```

### ReadCloser

```ts
interface ReadCloser extends Reader, Closer
```

### Writer

```ts
interface Writer {
	write(p: Uint8Array): Promise<[number, Error | undefined]>;
}
```

### WriterTo

```ts
interface WriterTo {
	writeTo(w: Writer): Promise<[number, Error | undefined]>;
}
```

### WriteCloser

```ts
interface WriteCloser extends Writer, Closer
```

## Functions

None
