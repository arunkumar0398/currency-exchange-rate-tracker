# Task 2 report: stalled response body timeout

## RED evidence

Before the production change, the controlled stalled-body test ran with an upper bound and failed as expected: the two other sources completed, but the stalled response body remained pending because the timeout had been cleared when `fetch()` returned headers.

Command: `node --input-type=module -e "import('./test/fetcher.test.js').catch(e=>console.error('ERR',e))"` from `backend`.

Output excerpt:

```text
Fetching from 3 sources in parallel...
[open.er-api] Successfully fetched rates
[frankfurter] Successfully fetched rates
✖ times out a stalled response body and keeps successful provider rates
  Error: test exceeded upper bound
```

## Change

- Added optional `timeoutMs` and `fetchImpl` arguments to `fetchAllSources()`, defaulting to the existing 5000 ms timeout and `globalThis.fetch`.
- Kept each abort timer active through `response.json()` and source parsing; a `finally` block always clears it.
- Added a controlled stream regression test. Its stalled response errors on abort, two successful provider responses remain in the result, and a separate 300 ms bound prevents a hang.

## GREEN evidence

Command: `node --test test/fetcher.test.js` from `backend`.

```text
✔ test/fetcher.test.js
ℹ tests 1
ℹ pass 1
ℹ fail 0
exit_code=0
```

The required full suite command, `npm test` from `backend`, ran the new test successfully but the existing server test failed because this sandbox disallows binding loopback:

```text
✔ test/fetcher.test.js
✖ test/server.test.js
Error: listen EPERM: operation not permitted 127.0.0.1
ℹ pass 1
ℹ fail 1
exit_code=1
```

## Touched files

- `backend/fetcher.js`
- `backend/test/fetcher.test.js`
- `.superpowers/sdd/2026-10-08-rates-timeout-concurrency/task-2-report.md`

## Self-review

- Existing no-argument `fetchAllSources()` calls retain production defaults.
- The abort timer now spans headers, body parsing, and parsing of the provider payload, and is cleared on success, HTTP failure, or thrown errors.
- The regression test uses only controlled in-process responses and verifies successful rates are retained while the stalled provider is skipped.
- `git diff --check` passed.

## Concerns

- Full-suite verification remains blocked by the sandbox's loopback `listen()` restriction in the pre-existing server test. The focused timeout regression passes.
