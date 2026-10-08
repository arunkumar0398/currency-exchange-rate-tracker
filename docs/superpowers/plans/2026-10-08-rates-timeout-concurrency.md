# Rate Fetch Timeout and Refresh Coalescing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure provider timeouts cover the full response body and concurrent `/api/rates` requests await one shared refresh.

**Architecture:** Preserve the existing three-provider aggregation and stale-cache contract. First make app startup/import testable without starting a listener; then use Node's built-in test runner and controlled upstream responses to reproduce each failure before applying a small root-cause fix.

**Tech Stack:** Node.js 18 (root Docker runtime), ES modules, Express 5, Node `node:test`, native `fetch`.

**Spec:** Source-review findings in `backend/fetcher.js` and `backend/server.js` on `master`; the backend README documents partial-provider fallback, stale-cache fallback, and 503 behavior.

## Global Constraints

- Preserve Node.js 18 runtime compatibility.
- Preserve three fixed provider URLs, the 5-second production timeout, and partial success when a source fails.
- Preserve the existing `/api/rates` live, stale, and unavailable response contracts.
- No external network calls in automated tests; mock only provider responses, while exercising the production fetch, refresh, and HTTP route code paths.
- No unrelated CORS, event-loop, deployment, or frontend changes.

## Review Focus

- Headers arrive but the response body stalls: provider work settles within its timeout.
- One provider stalls while others succeed: successful provider data is still resolved.
- Concurrent callers overlap during empty-cache refresh: one refresh runs and both callers get its outcome.
- Concurrent callers overlap during stale-cache refresh: callers await the refresh rather than returning stale data early.
- A shared refresh fails: callers use existing stale/503 fallback, and a later request can retry.

---

### Task 1: Establish an import-safe test harness

**Files:**
- Modify: `backend/server.js`
- Modify: `backend/package.json`
- Create: `backend/test/server.test.js`

**Interfaces:**
- Export named `createApp()` from `backend/server.js`; it constructs routes and middleware without listening or pre-warming.
- Preserve the current default `app` export for compatibility, but do not bind a port or pre-warm merely by importing the module.
- Keep `node server.js` as the production entry point that listens and pre-warms.
- Add `npm test` using Node's built-in `node --test`; add no test dependency.

- [x] **Step 1: Extract `createApp()` and guard production startup** so importing the module does not listen on port 3001 or pre-warm the cache.
- [x] **Step 2: Add a minimal HTTP smoke test** that starts `createApp()` on an ephemeral port, checks `GET /api/currencies`, then closes the server.
- [x] **Step 3: Add the `test` script and run `cd backend && npm test`.** Confirm the smoke test passes and the process exits without open handles.

### Task 2: Reproduce and fix the stalled-body timeout

**Files:**
- Modify: `backend/fetcher.js`
- Create: `backend/test/fetcher.test.js`

**Interfaces:**
- Preserve default `fetchAllSources()` behavior; add optional `timeoutMs` and `fetchImpl` test seams with production defaults of 5000 ms and `globalThis.fetch`.
- Keep the abort deadline active through `response.json()`, and clear its timer in a `finally` path.

- [x] **Step 1: Write a test with a controlled `fetchImpl`** that immediately returns a Response whose body stream stalls and is cancelled/rejected when the supplied signal aborts. Use a short timeout and put a separate upper bound on the test itself so the pre-fix case fails instead of hanging.
- [x] **Step 2: Include successful provider responses** and assert the stalled source is skipped while the successful rates remain in the result.
- [x] **Step 3: Run the focused test against current code and confirm it fails** because the timer is cleared after headers, leaving body parsing pending.
- [x] **Step 4: Extend the timeout through body parsing; rerun the focused test** and confirm it passes without leaked timers or hanging work.

### Task 3: Reproduce and fix overlapping refresh behavior

**Files:**
- Modify: `backend/server.js`
- Modify: `backend/cache.js`
- Modify: `backend/test/server.test.js`

**Interfaces:**
- Replace the boolean-only early return with one shared in-flight refresh promise; concurrent callers await it.
- Retain the cache's `isRefreshing` health statistic, setting it when refresh starts and clearing it in `finally`.
- Clear the shared promise after success or failure, allowing future retries.
- Add optional timestamp argument to `cache.set(data, timestamp = Date.now())` so tests can seed expired state deterministically; existing production calls retain current behavior.
- Use Node `http` for test requests so stubbing `globalThis.fetch` affects only upstream provider calls.

- [x] **Step 1: Add a deferred-provider empty-cache concurrency test.** Assert one refresh (one call per configured provider) and that both HTTP requests receive the same live outcome.
- [x] **Step 2: Add a stale-cache concurrency test** using a cache timestamp older than `CACHE_TTL`; assert both requests await refresh and return fresh live data on success.
- [x] **Step 3: Add a shared-failure/retry test.** Assert concurrent waiters follow stale-data or 503 fallback, then a later request can initiate a new refresh.
- [x] **Step 4: Run the focused server tests against current code and confirm the overlap cases expose premature 503/stale responses.**
- [x] **Step 5: Implement the shared promise and rerun focused tests.** Confirm provider calls are coalesced and the promise resets after both fulfillment and failure.

### Task 4: Full verification and evidence

**Files:**
- Review: all files changed in Tasks 1–3.
- Modify: `backend/README.md` only if the test command or externally visible behavior needs documenting.

- [x] **Step 1: Run `cd backend && npm test` and retain the command result.**
- [x] **Step 2: Run a local HTTP smoke check** for `/api/rates` with controlled provider success and all-provider failure; verify live and 503 contracts. Include stale fallback if the harness can seed it through the cache API.
- [x] **Step 3: Inspect the final diff** for the stated scope, timeout cleanup, refresh reset, and preserved response fields.
- [x] **Step 4: Report only executed checks as verified.** No CI, deployment, or live third-party-provider success claim unless separately run.

**Runtime note:** Verification ran on Node.js v24.19.0. Node.js 18 was not available for an additional runtime test; compatibility was checked against the project's Node 18 target by code review.

## Lens self-review

- **Real vs simulated:** route, refresh, fetch, abort, and body parsing code paths run; only external providers are controlled test doubles.
- **Reproducibility and cause:** tests recreate the stalled body and overlapping callers, bound their own runtime, and assert the observed wrong behavior before implementation.
- **Recovery and invariants:** assert partial provider recovery, stale/503 fallback, single refresh, and retry after failure.
- **Boundaries:** `createApp()` is a small testability boundary; no general framework or new dependency is introduced.
- **Evidence:** test output and final diff are required; intentions are not completion evidence.
- **Project-specific exclusions:** ModelContract's Bright Data, Neon, extraction-drift, and semantic-drift rules do not apply to this currency tracker.
