# bytes

Byte-slice helpers and buffer utilities.

## Contents

- [Constants](#constants)
- [Types](#types)
- [Functions](#functions)

## Constants

```ts
const MinRead = 512;
```

Minimum read buffer size.

## Types

### Buffer

```ts
class Buffer implements Reader, Writer {
	size: number;
	capacity: number;
	constructor(memory: ArrayBufferLike);
}
```

### function (Buffer).bytes

```ts
bytes(): Uint8Array
```

Returns the readable portion of the buffer as a Uint8Array.

### function (Buffer).cap

```ts
cap(): number
```

Returns the capacity of the buffer.

### function (Buffer).capacity

```ts
capacity: number;
```

Gets the capacity of the buffer.

### function (Buffer).grow

```ts
grow(n: number): void
```

Grows the buffer to guarantee space for n more bytes.

### function (Buffer).len

```ts
len(): number
```

Returns the number of bytes of the unread portion of the buffer.

### function (Buffer).make

```ts
static make(capacity: number): Buffer
```

Creates a new Buffer with the given capacity.

### function (Buffer).next

```ts
next(n: number): Uint8Array
```

Returns the next n bytes from the buffer without advancing the read position.

### function (Buffer).read

```ts
read(buf: Uint8Array): Promise<[number, Error | undefined]>
```

Reads up to buf.length bytes into buf.

### function (Buffer).readByte

```ts
readByte(): [number, Error | undefined]
```

Reads and returns the next byte from the buffer.

### function (Buffer).readBytes

```ts
readBytes(delim: number): [Uint8Array, undefined] | [undefined, Error]
```

Reads until the first occurrence of delim in the input, returning a Uint8Array containing the data up to and including the delimiter.

### function (Buffer).readFrom

```ts
readFrom(r: Reader): Promise<[number, Error | undefined]>
```

Reads from r until EOF and appends to the buffer, returning the number of bytes read.

### function (Buffer).readRune

```ts
readRune(): [number, number, Error | undefined]
```

Reads a single UTF-8 encoded Unicode code point from the buffer, returning the rune and its size in bytes.

### function (Buffer).readString

```ts
readString(delim: number): [string, undefined] | [string, Error]
```

Reads until the first occurrence of delim in the input, returning a string containing the data up to and including the delimiter.

### function (Buffer).reset

```ts
reset(): void
```

Resets the buffer to be empty but retains the underlying storage.

### function (Buffer).size

```ts
size: number;
```

Gets the number of bytes of the unread portion of the buffer.

### function (Buffer).toString

```ts
toString(): string
```

Returns the contents of the buffer as a string.

### function (Buffer).truncate

```ts
truncate(n: number): void
```

Discards all but the first n unread bytes from the buffer.

### function (Buffer).unreadByte

```ts
unreadByte(): Error | undefined
```

Unreads the last byte returned by the most recent successful read operation that read at least one byte.

### function (Buffer).unreadRune

```ts
unreadRune(): Error | undefined
```

Unreads the last rune returned by the most recent successful read operation that read at least one rune.

### function (Buffer).write

```ts
write(data: Uint8Array): Promise<[number, Error | undefined]>
```

Writes data to the buffer, growing the buffer as needed.

### function (Buffer).writeByte

```ts
writeByte(value: number): void
```

Writes a single byte to the buffer.

### function (Buffer).writeRune

```ts
writeRune(r: number): Promise<[number, Error | undefined]>
```

Writes a single UTF-8 encoded Unicode code point to the buffer.

### function (Buffer).writeString

```ts
writeString(s: string): Promise<[number, Error | undefined]>
```

Writes a string to the buffer.

### function (Buffer).writeTo

```ts
writeTo(w: Writer): Promise<[number, Error | undefined]>
```

Writes the contents of the buffer to w.

### TooLargeError

```ts
class TooLargeError extends Error
```

```ts
constructor(message?: string)
```

## Functions

### function clone

```ts
function clone(src: Uint8Array): Uint8Array;
```

Returns a copy of the given byte slice.

### function compare

```ts
function compare(a: Uint8Array, b: Uint8Array): number;
```

Returns an integer comparing two byte slices lexicographically.

### function contains

```ts
function contains(b: Uint8Array, subslice: Uint8Array): boolean;
```

Reports whether subslice is within b.

### function containsAny

```ts
function containsAny(b: Uint8Array, chars: string): boolean;
```

Reports whether any of the UTF-8-encoded code points in chars are within b.

### function count

```ts
function count(s: Uint8Array, sep: Uint8Array): number;
```

Counts the number of non-overlapping instances of sep in s.

### function cut

```ts
function cut(s: Uint8Array, sep: Uint8Array): [Uint8Array, Uint8Array, boolean];
```

Slices s around the first instance of sep, returning the text before and after sep.

### function cutPrefix

```ts
function cutPrefix(s: Uint8Array, prefix: Uint8Array): [Uint8Array, boolean];
```

Returns s without the provided leading prefix slice and reports whether it found the prefix.

### function cutSuffix

```ts
function cutSuffix(s: Uint8Array, suffix: Uint8Array): [Uint8Array, boolean];
```

Returns s without the provided ending suffix slice and reports whether it found the suffix.

### function equal

```ts
function equal(a: Uint8Array, b: Uint8Array): boolean;
```

Reports whether a and b are the same length and contain the same bytes.

### function equalFold

```ts
function equalFold(s: Uint8Array, t: Uint8Array): boolean;
```

Reports whether s and t, interpreted as UTF-8 strings, are equal under Unicode case-folding.

### function fields

```ts
function fields(s: Uint8Array): Uint8Array[];
```

Splits the slice s around each instance of one or more consecutive white space characters.

### fieldsFunc

```ts
function fieldsFunc(s: Uint8Array, f: (r: number) => boolean): Uint8Array[];
```

Splits the slice s into subslices according to the predicate f.

### hasPrefix

```ts
function hasPrefix(s: Uint8Array, prefix: Uint8Array): boolean;
```

Tests whether the byte slice s begins with prefix.

### hasSuffix

```ts
function hasSuffix(s: Uint8Array, suffix: Uint8Array): boolean;
```

Tests whether the byte slice s ends with suffix.

### index

```ts
function index(s: Uint8Array, sep: Uint8Array): number;
```

Returns the index of the first instance of sep in s, or -1 if sep is not present in s.

### indexAny

```ts
function indexAny(s: Uint8Array, chars: string): number;
```

Returns the byte index of the first occurrence in s of any of the Unicode code points in chars.

### indexByte

```ts
function indexByte(s: Uint8Array, c: number): number;
```

Returns the index of the first instance of c in s, or -1 if c is not present in s.

### indexFunc

```ts
function indexFunc(s: Uint8Array, f: (r: number) => boolean): number;
```

Returns the byte index in s of the first Unicode code point satisfying f(c), or -1 if none do.

### indexRune

```ts
function indexRune(s: Uint8Array, r: number): number;
```

Returns the byte index of the first occurrence in s of the given rune, or -1 if rune is not present in s.

### join

```ts
function join(s: Uint8Array[], sep: Uint8Array): Uint8Array;
```

Concatenates the elements of s to create a new byte slice.

### lastIndex

```ts
function lastIndex(s: Uint8Array, sep: Uint8Array): number;
```

Returns the index of the last instance of sep in s, or -1 if sep is not present in s.

### lastIndexAny

```ts
function lastIndexAny(s: Uint8Array, chars: string): number;
```

Returns the byte index of the last occurrence in s of any of the Unicode code points in chars.

### lastIndexByte

```ts
function lastIndexByte(s: Uint8Array, c: number): number;
```

Returns the index of the last instance of c in s, or -1 if c is not present in s.

### lastIndexFunc

```ts
function lastIndexFunc(s: Uint8Array, f: (r: number) => boolean): number;
```

Returns the byte index in s of the last Unicode code point satisfying f(c), or -1 if none do.

### map

```ts
function map(mapping: (r: number) => number, s: Uint8Array): Uint8Array;
```

Returns a copy of the byte slice s with all its characters modified according to the mapping function.

### repeat

```ts
function repeat(b: Uint8Array, count: number): Uint8Array;
```

Returns a new byte slice consisting of count copies of b.

### replace

```ts
function replace(s: Uint8Array, old: Uint8Array, new_: Uint8Array, n: number): Uint8Array;
```

Returns a copy of the slice s with the first n non-overlapping instances of old replaced by new.

### replaceAll

```ts
function replaceAll(s: Uint8Array, old: Uint8Array, new_: Uint8Array): Uint8Array;
```

Returns a copy of the slice s with all non-overlapping instances of old replaced by new.

### runWhile

```ts
function runWhile(s: Uint8Array, i: number, r: (b: number) => boolean): Uint8Array;
```

Returns a subslice of s, starting at index i and extending as long as r(i) returns true for each element.

### split

```ts
function split(s: Uint8Array, sep: Uint8Array, n: number): Uint8Array[];
```

Slices s into all subslices separated by sep and returns a slice of the subslices between those separators.

### splitAfter

```ts
function splitAfter(s: Uint8Array, sep: Uint8Array, n: number): Uint8Array[];
```

Slices s into all subslices after each instance of sep and returns a slice of those subslices.

### splitAfterN

```ts
function splitAfterN(s: Uint8Array, sep: Uint8Array, n: number): Uint8Array[];
```

Slices s into subslices after each instance of sep and returns a slice of those subslices.

### splitN

```ts
function splitN(s: Uint8Array, sep: Uint8Array, n: number): Uint8Array[];
```

Slices s into subslices separated by sep and returns a slice of the subslices between those separators.

### toLower

```ts
function toLower(s: Uint8Array): Uint8Array;
```

Returns a copy of the byte slice s with all Unicode letters mapped to their lower case.

### toTitle

```ts
function toTitle(s: Uint8Array): Uint8Array;
```

Returns a copy of the byte slice s with all Unicode letters mapped to their title case.

### toUpper

```ts
function toUpper(s: Uint8Array): Uint8Array;
```

Returns a copy of the byte slice s with all Unicode letters mapped to their upper case.

### toValidUTF8

```ts
function toValidUTF8(s: Uint8Array, r: Uint8Array): Uint8Array;
```

Returns a copy of the byte slice s with each run of invalid UTF-8 byte sequences replaced by the replacement slice r.

### trim

```ts
function trim(s: Uint8Array, cutset: Uint8Array): Uint8Array;
```

Returns a subslice of s by slicing off all leading and trailing UTF-8-encoded code points contained in cutset.

### trimFunc

```ts
function trimFunc(s: Uint8Array, f: (r: number) => boolean): Uint8Array;
```

Returns a subslice of s by slicing off all leading and trailing Unicode code points c satisfying f(c).

### trimLeft

```ts
function trimLeft(s: Uint8Array, cutset: Uint8Array): Uint8Array;
```

Returns a subslice of s by slicing off all leading UTF-8-encoded code points contained in cutset.

### trimLeftFunc

```ts
function trimLeftFunc(s: Uint8Array, f: (r: number) => boolean): Uint8Array;
```

Returns a subslice of s by slicing off all leading Unicode code points c satisfying f(c).

### trimPrefix

```ts
function trimPrefix(s: Uint8Array, prefix: Uint8Array): Uint8Array;
```

Returns s without the provided leading prefix slice.

### trimRight

```ts
function trimRight(s: Uint8Array, cutset: Uint8Array): Uint8Array;
```

Returns a subslice of s by slicing off all trailing UTF-8-encoded code points contained in cutset.

### trimRightFunc

```ts
function trimRightFunc(s: Uint8Array, f: (r: number) => boolean): Uint8Array;
```

Returns a subslice of s by slicing off all trailing Unicode code points c satisfying f(c).

### trimSpace

```ts
function trimSpace(s: Uint8Array): Uint8Array;
```

Returns a subslice of s by slicing off all leading and trailing white space, as defined by Unicode.

### trimSuffix

```ts
function trimSuffix(s: Uint8Array, suffix: Uint8Array): Uint8Array;
```

Returns s without the provided ending suffix slice.
