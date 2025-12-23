

# Changelog

All notable changes to this project will be documented in this file.

The format is based on "Keep a Changelog" and this project adheres to Semantic Versioning.

## [Unreleased]

### Added

- **`sync.Once`**: Added Go-style `Once` synchronization primitive to the sync package.
  - Ensures a function is executed exactly once, even under concurrent calls
  - Promise-based implementation optimized for JavaScript's event loop
  - Full type safety with generic return types
  - Handles errors while marking the operation as "done" (matching Go semantics)
  - Includes comprehensive test suite (9 test cases) covering concurrent execution, error handling, and type preservation

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