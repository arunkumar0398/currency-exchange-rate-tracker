# Rate Fetch Timeout and Refresh Coalescing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure provider timeouts cover the full response body and concurrent `/api/rates` requests await one shared refresh.

**Architecture:** Keep the existing three-provider aggregation and stale-cache contract. Add a small Node built-in test harness, then make the fetch timeout span fetch plus JSON body consumption and coalesce refresh callers around one in-flight promise.

**Tech Stack:** Node.js 18 (Docker runtime), ES modules, Express 5, Node `node:test`, native `fetch`.

**Spec:** Source-review findings in `backend/fetcher.js` and `backend/server.js` on `master`; repository README documents partial-provider fallback, stale-cache fallback, and 503 behavior.

## Global Constraints

- Preserve the Node.js 18 runtime specified by the root `Dockerfile`.
- Preserve the three fixed upstream providers and the 5-second per-provider timeout.
- Preserve partial success: one failed provider must not discard successful provider results.
- Preserve the current stale-cache response and 503 response when no data exists and all providers fail.
- Keep this change limited to response-body timeout coverage, refresh coalescing, and tests required to verify them.

## Review Focus

- Headers arrive but the response body stalls: the provider must settle within its timeout.
- One provider times out while another succeeds: successful provider data must still be used.
- Two requests overlap during refresh with an empty cache: one provider refresh runs and both requests await its result.
- Two requests overlap during refresh with stale cache: both callers observe the completed refresh result, not a premature stale response.
- A shared refresh fails: all waiters use the existing stale-data or unavailable fallback, and a later request can start another refresh.

---

### Task 1: Add a minimal backend test harness

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/server.js`
- Create: `backend/test/fetcher.test.js`
- Create: `backend/test/server.test.js`

**Interfaces:**
- Produce `createApp()` from `backend/server.js`, returning an Express app without listening or starting pre-warm work.
- Keep production startup behavior when running `node server.js`.
- Add `npm test` using `node --test`; add no test dependency.

- [ ] **Step 1: Create tests that import the app without opening a fixed port**, and start it on an ephemeral port in test setup; reset cache and restore mocked `globalThis.fetch` in teardown.
- [ ] **Step 2: Run `npm test` and verify the harness runs cleanly** before adding regression assertions.
- [ ] **Step 3: Extract app construction from production startup** so importing `createApp()` has no listen/pre-warm side effects; keep pre-warm in direct server startup.
- [ ] **Step 4: Run `npm test` and verify clean exit with no open handles.**

### Task 2: Make the provider timeout cover body consumption

**Files:**
- Modify: `backend/fetcher.js`
- Test: `backend/test/fetcher.test.js`

**Interfaces:**
- Keep `fetchAllSources()` behavior and existing provider configuration unchanged.
- Ensure the five-second abort deadline remains active through `response.json()`; clear its timer in a `finally` path.

- [ ] **Step 1: Add a test whose mocked provider resolves headers but stalls on its response body.** Assert it is treated as a failed source after the timeout.
- [ ] **Step 2: Run the focused test and verify it fails against current code** because the body read outlives the timeout.
- [ ] **Step 3: Add a successful provider response to the same test** and assert `fetchAllSources()` returns that source despite the stalled provider.
- [ ] **Step 4: Run the focused test and verify it passes** with the timeout spanning fetch and body parsing.

### Task 3: Coalesce concurrent refreshes

**Files:**
- Modify: `backend/server.js`
- Test: `backend/test/server.test.js`

**Interfaces:**
- Represent the active refresh as a shared promise; concurrent callers await that promise.
- Clear the shared promise after success or failure so subsequent refresh attempts can proceed.
- Retain the existing `/api/rates` live, stale, and unavailable response formats.

- [ ] **Step 1: Add an empty-cache overlap test** with a deferred upstream response; assert only one refresh occurs and both HTTP requests receive the successful live result.
- [ ] **Step 2: Run the focused test and verify it fails against current code** because one caller returns unavailable before the active refresh completes.
- [ ] **Step 3: Add a stale-cache overlap test**; assert both callers await refresh and return live data when refresh succeeds.
- [ ] **Step 4: Add a shared-failure test**; assert callers follow the documented stale or 503 fallback and a later request can initiate a new refresh.
- [ ] **Step 5: Implement the shared in-flight promise** and run the focused server tests.

### Task 4: Full verification

**Files:**
- Review: all files changed in Tasks 1–3.
- Modify: `backend/README.md` only if externally visible behavior or test instructions need documenting.

- [ ] **Step 1: Run `cd backend && npm test` and confirm all tests pass.**
- [ ] **Step 2: Inspect the final diff** for unchanged endpoint response shapes, no leaked timer or refresh state, and no unrelated CORS/event-loop changes.
- [ ] **Step 3: Commit the implementation and tests** with a focused message such as `fix: bound provider reads and coalesce rate refreshes`.

## Self-review

- Both reported findings have regression tests tied to the owning code.
- Existing success, partial-provider-failure, stale-cache, and no-cache 503 semantics are explicit constraints.
- Node 18 includes `node:test` and native `fetch`, so the plan avoids adding dependencies.
- The repo currently has no backend tests or `test` script; Task 1 establishes those before behavior changes.
