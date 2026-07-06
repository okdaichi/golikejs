

# Changelog

All notable changes to this project will be documented in this file.

The format is based on "Keep a Changelog" and this project adheres to Semantic Versioning.

## [Unreleased]

### Added

- **CI/release automation**: Required-changelog workflow (enforces CHANGELOG.md updates on non-trivial PRs, with a `no-changelog` label escape hatch) and a tag-driven Release workflow (`deno publish` to JSR + GitHub Release on `v*` tags).

## [0.10.0] - 2026-07-06

### Changed

- **`bytes.index` / `bytes.lastIndex`**: Replaced the O(n·m) nested-loop search with a first-byte scan via native `Uint8Array.indexOf`/`lastIndexOf` plus a short-circuit tail compare (the strategy production Go's `bytes.Index` uses). Throughput wins cascade to `contains`, `count`, `cut`, and `split`, all of which delegate to `index`.
- **`bytes.fields`**: Added a zero-copy ASCII fast path — a single byte scan returning subslices of the input (matching the documented "subslices of s" contract and Go's `bytes.Fields`). Non-ASCII input falls back to the unchanged `/\s/`-based path. **Behavior note:** for ASCII input the returned subslices now alias `s`; callers needing independent memory should copy.
- **`bytes.equal`**: Compare 4 bytes at a time via aligned `Uint32Array` views (~1.9× faster), falling back to a byte loop for unaligned subarrays.

### Fixed

- **`channel.select`**: Replaced the biased `.sort(() => Math.random() - 0.5)` fairness step with reservoir sampling (k=1), which is genuinely uniform, O(n), allocation-free, and faster. The previous shuffle systematically disadvantaged later cases.

### Performance

| Operation | Before | After | Δ |
| --- | --- | --- | --- |
| `index` (64 KiB, 8-byte needle) | 81.3 µs | 25.2 µs | −69% |
| `contains` | 78.7 µs | 26.5 µs | −66% |
| `count` | 77.9 µs | 26.5 µs | −66% |
| `cut` | 79.8 µs | 25.6 µs | −68% |
| `split` | 77.5 µs | 25.2 µs | −67% |
| `lastIndex` | 66.5 µs | 27.3 µs | −59% |
| `fields` (1.7 KiB ASCII) | 137.4 µs | 13.2 µs | −90% |
| `equal` (1 KiB) | 372.4 ns | 192.2 ns | −48% |
| `select` w/ default (1k polls) | 185.1 µs | 134.0 µs | −28% |
| `select` 2 chans (1k ready) | 312.6 µs | 252.9 µs | −19% |

## [0.9.0] - 2026-04-25

### Notes

- No user-facing changes since 0.8.0 (republish).

## [0.8.0] - 2026-04-25

### Added

- **`channel`**: Major overhaul of the Channel primitive.
  - Buffered and unbuffered channels.
  - Async iterator support (`for await ... of`).
  - Directional `SendChan` / `ReceiveChan` interfaces.
  - `Channel.from(iterable)` static factory.
  - Enhanced `select` handling multiple cases with a `default` case.
  - Comprehensive test coverage for channel operations, async iteration, and select.

### Changed

- **`channel`**: `send` and `receive` accept an options object (e.g. `AbortSignal` and an internal `isActive` predicate) to support cancellation and `select` coordination.

## [0.7.0] - 2025-12-24

### Added

- **`sync.Once`**: Go-style `Once` synchronization primitive — executes a function exactly once, even under concurrent calls. Promise-based, fully typed with generic return types, and treats a throwing function as "done" (matching Go semantics).

### Changed

- **Package name**: Package prefix changed from `@okudai/golikejs` to `@okdaichi/golikejs` to match the updated username. *(Also previously noted under 0.6.1.)*

## [0.6.1] - 2025-12-09

### Changed

- **Package name**: Changed package prefix from `@okudai/golikejs` to `@okdaichi/golikejs` to match the updated username.
- **Repository URL**: Updated remote repository URL from `OkutaniDaichi0106/gosync` to `okdaichi/golikejs`.

## [0.6.0] - 2025-11-04

### Added

- **`src/bytes` package**: Added comprehensive Go-like bytes utilities for byte slice manipulation.
  - **Search functions**: `compare`, `contains`, `index`, `hasPrefix`, `hasSuffix`, `lastIndex`, etc.
  - **Transform functions**: `toLower`, `toUpper`, `toTitle`, `replace`, `replaceAll`, `map`, etc.
  - **Split/Join functions**: `split`, `join`, `fields`, `cut`, `cutPrefix`, `cutSuffix`, etc.
  - **Trim functions**: `trim`, `trimLeft`, `trimRight`, `trimSpace`, `trimPrefix`, `trimSuffix`, etc.
  - Comprehensive test coverage with Go-style table-driven tests using maps for better organization
  - Added/updated tests in `src/bytes` covering `split`, `splitAfter`, `replace`, `replaceAll`, `toTitle`, and other transform functions. All `src/bytes` tests pass locally.

### Fixed

- **`bytes.Split` / `bytes.SplitAfter`**: Corrected behavior when using the `n` parameter so that at most `n` subslices are returned and the remainder is kept as the last element (matches Go semantics). Fixed edge cases when `n == 0` and `n == 1`.
- **`bytes.Replace`**: Implemented the correct behavior when `old` is empty — it now matches at the beginning of the slice and after each UTF-8 sequence, yielding up to k+1 replacements for a k-rune slice (per Go spec).
- **`bytes.ToTitle`**: Adjusted implementation and tests to follow Go's Unicode title-case mapping semantics (note: for many Latin letters `ToTitle` and `ToUpper` are equivalent, but they differ for some Unicode characters).

### Changed

- **Channel module moved**: Moved the `Channel` implementation from `src/channel` into the main module (`src/mod.ts`) and removed the standalone `src/channel` module. Update imports from `./channel` to the package root (e.g. `import { Channel } from "@golikejs/golikejs"`) or use the re-export stub if provided to preserve compatibility.
- Improve `bytes.Buffer`: add rune support, fast-paths for `readFrom`/`writeTo`, and clarify `readBytes`/`readString` EOF behavior.
- Add `runtime_test.yml`, bump `deno.json` to `0.6.0`, and add module docs in `mod.ts`.
- Updated CONTRIBUTING.md to reflect golikejs project structure and Deno-based development workflow.

(Related issues: #8, #9)

## [0.3.2] - 2025-10-22

### Added

- **`afterFunc()` function**: Added Go-style `context.AfterFunc` implementation to the context package for registering cleanup callbacks that execute when a context is cancelled or finished.
  - Returns a `stop()` function to prevent callback execution before it runs
  - Supports both synchronous and asynchronous callbacks
  - Errors in callbacks are silently ignored (fire-and-forget execution)
  - Works seamlessly with all context creation functions (`withCancel`, `withTimeout`, `watchPromise`, etc.)

## [0.3.1] - 2025-10-13

### Performance

- **Test optimization**: Reduced test execution time by ~18% (from ~11s to ~9.5s) by optimizing timeouts and reducing worker counts in integration tests.
- **Timeout reductions**: Decreased setTimeout values across tests (semaphore: 50ms→10ms, context: 100ms→50ms, channel workers: 10-40ms→5-15ms).
- **Worker count optimization**: Reduced concurrent worker count in channel tests from 30 to 15 for faster execution.

## [0.3.0] - 2025-01-15

### Added

- **`select()` function**: Added Go-style select functionality to the channel package for multiplexing channel operations with default case support.
- **Helper functions**: Added `receive()`, `send()`, and `default_()` helper functions with Promise-chain style API for more intuitive select usage.

## [0.2.0] - 2025-01-15

### Added

- `src/io` — Added Go-like io utilities.
- `src/io/errors.ts` — Added Go-like io errors.
- `WaitGroup.go()` — Added Go method to WaitGroup for automatic counter management of async functions.

## [0.1.8] - 2025-10-13

### Added

- `src/io` — Added Go-like io utilities.
- `src/io/errors.ts` — Added Go-like io errors.
- `WaitGroup.go()` — Added Go method to WaitGroup for automatic counter management of async functions.

## [0.1.8] - 2025-10-13

### Added

- CommonJS support alongside ESM in package exports.

### Fixed

- Flaky semaphore test timing assertions.

## [0.1.7] - 2025-10-02

### Added

- CommonJS support alongside ESM in package exports.

### Fixed

- Flaky semaphore test timing assertions.

## [0.1.6] - 2025-10-02

### Fixed

- Package exports for ESM-only support to fix import issues in test runtimes.

## [0.1.5] - 2025-10-02

### Changed

- Migrated from Bun to Node.js/npm environment.
- Updated build scripts and test setup.

## [0.1.4] - 2025-10-02

### Fixed

- Git tag conflicts during version bump.

## [0.1.3] - 2025-10-02

### Added

- Initial release with sync and context packages.

## [0.1.0] - 2025-09-30

### Added

- `src/context` — Go-like context utilities (Background, withCancel, withTimeout, done semantics).
- `src/sync/channel.ts` — Channel<T> with unbuffered/buffered semantics (ring buffer).
- `src/sync/mutex.ts`, `src/sync/rwmutex.ts` — Mutex and RWMutex.
- `src/sync/waitgroup.ts` — WaitGroup.
- `src/sync/semaphore.ts` — Semaphore.
- `src/sync/cond.ts` — Cond compatible with Go's `sync.Cond`.
- Tests and Bun-based test setup (`bun test`).
- CI workflow and Codecov integration.
- Publish workflow to publish releases to npm (requires `NPM_TOKEN`).
- Documentation: `README.md` and `README.ja.md`.

### Changed

- Project reorganized and package renamed to `golikejs` to reflect broader scope (reimplementations of Go standard packages).

### Fixed

- N/A

---

For details, see `README.md` and repository files.