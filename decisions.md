# decisions.md — AnchorFX Build Notes

## What We Built & Why

Built a currency exchange tracker (codename AnchorFX) that pulls rates from multiple free APIs and shows them in a clean UI. The goal wasn't just "show some rates" — it was to build something that feels reliable even when the free-tier APIs we depend on aren't 100% solid.

Main challenge: free APIs go down. They rate-limit. They're slow sometimes. But we can't just throw money at premium APIs for a demo/starter project. So the question became: how do we make something that *feels* premium using free resources?

Answer: smart caching, parallel fetching, and being honest with the user when data is stale.

---

## Decision 1: Why Node.js + Express for Backend?

**Chose:** Node.js with Express

**Why:**
- Async by default, which matters when you're hitting 3 APIs in parallel. The event loop handles this naturally.
- npm has fetch built-in (well, node-fetch for v16+). No need for axios or other HTTP libs.
- Express is boring tech — which is good. Everyone knows it, docs are everywhere, deploy anywhere.
- Fast to prototype. I'm not building the next Netflix here.

---

## Decision 2: Which Free APIs?

**Picked:**
1. `exchangerate-api.com` (free tier)
2. `open.er-api.com`
3. `api.frankfurter.app`

**Why these three?**
- Different infrastructure. Exchangerate-api is a commercial service with a free tier. Frankfurter is backed by ECB data and run independently. Open.er-api is another aggregator. They don't fail at the same time.
- All support USD as base without auth (well, exchangerate-api has a key but the open endpoint works).
- All return timestamps so we can tell which data is fresher.
- Frankfurter is *slightly* slower (ECB updates once a day at a specific time) but it's rock-solid reliable. Good fallback.

**What I didn't use:**
- CurrencyAPI, Fixer.io — either need auth for USD base or have quirky free tiers.
- Alpha Vantage — more stock/forex focused, API design is clunky for simple spot rates.
- Crypto APIs (CoinGecko, etc.) — not forex, different use case.

**The risk:** All three could theoretically go down. In practice, I haven't seen it happen during testing. If it does, we show cached data with a big warning. User knows what's up.

---

## Decision 3: Fetch in Parallel, Not Sequential

**What I did:**
```javascript
const results = await Promise.all([
  fetchFromAPI1(),
  fetchFromAPI2(),
  fetchFromAPI3()
])
```

**Why not sequential (try A, if fail try B, if fail try C)?**
Because sequential adds latency on the happy path. If A takes 500ms and succeeds, great. But if A takes 5 seconds and *then* times out, and B also takes 3 seconds, the user waits 8+ seconds. That's terrible UX.

Parallel means we wait for the *fastest successful response*, which is usually under 1 second total.

**Trade-off:** We hit all three APIs every time, even when one would be enough. That uses more of our free-tier quota. But we get:
- Redundancy (if one is down, we don't notice)
- Fresher data (we can pick the newest timestamp)
- Ability to average rates (if timestamps are close, averaging smooths out outliers)

For a production app with millions of requests, this might be wasteful. For a starter project showing ~100 requests/day? The reliability gain is worth it.

---

## Decision 4: Cache for 5 Minutes, Refresh in Background at 4 Minutes

**Caching strategy:**
- First request hits all APIs, stores result in memory (just a JS object, no Redis/Memcached).
- TTL = 5 minutes. Any request within 5 min gets cached data instantly.
- At 4 minutes, if a request comes in, we serve the cache but *also* trigger a background refresh. Next request gets fresh data.

**Why 5 minutes?**
- The source APIs (exchangerate-api, frankfurter) only update every 24 hours anyway. A 5-minute cache isn't making data stale — the data is already day-old by design.
- It protects against rate limits. If 10 users hit the site at once, they all get the same cached response. One API call, not ten.
- 5 min is short enough that if an API comes back online after an outage, we'll pick it up reasonably fast.

**Why refresh at 4 minutes instead of 5?**
Pre-warming. If the cache expires at exactly 5 min, the next request is slow (waits for fresh API calls). By refreshing at 4 min in the background, the cache is always "almost fresh" but we're not blocking the user.

**What I didn't do:**
- Redis/Memcached — overkill for a single-server demo. If we scaled to multiple servers, yeah, we'd need shared cache. But right now in-memory is simpler.
- No cache at all — would hit rate limits fast and make the UI slow.

---

## Decision 5: How to Resolve Conflicts Between APIs

**Problem:** API A says EUR is 0.8407. API B says 0.8405. API C says 0.8410. What do we show?

**Solution:**
1. Check timestamps. If one response is 3 hours newer, use that (it's fresher).
2. If timestamps are within 1 hour of each other, average the rates.
3. If only one API responded, use it directly.

**Why average when timestamps are close?**
The difference (0.8405 vs 0.8410) is noise, not signal. Free-tier APIs pull from different aggregators, and forex rates have bid/ask spreads. Averaging gives a "middle of the market" number that's probably more fair than picking one arbitrarily.

**Why NOT average when timestamps differ a lot?**
A 12-hour-old rate averaged with a 1-hour-old rate gives you a number that's neither — it's misleading. Better to just take the fresh one.

**Edge case:** If all APIs return wildly different numbers (like 0.84 vs 1.05), something's broken. We log it but still show the result with a timestamp. Users can judge for themselves. In practice, this hasn't happened.

---

## Decision 6: Frontend — Vite + React + Fluent UI

**Stack:**
- Vite for dev server + build (fast, no config hell)
- React 18 (hooks, functional components)
- Fluent UI (Microsoft's design system)

**Why Fluent UI instead of Material UI / Tailwind / plain CSS?**
- Wanted the app to feel polished without spending hours on design. Fluent UI gives you that "Office 365" look out of the box.
- Components like MessageBar, Card, Badge are pre-built and accessible. I'm not reinventing buttons.
- Icons are solid. MoneyRegular for the logo, PlugDisconnected for errors — it just works.

**Why NOT Tailwind?**
I like Tailwind, but for component-heavy apps I find myself writing the same card/button styles over and over. Fluent UI has those already. Tailwind shines for custom layouts; this app is mostly standard components.

**Why Vite over CRA (Create React App)?**
CRA is deprecated-ish, and Vite is way faster. HMR updates in like 50ms. Build times are instant. No eject drama.

---

## Decision 7: What the User Sees in Different States

| Backend State | What Frontend Shows | Why |
|---|---|---|
| All APIs healthy, cache fresh | Green "LIVE" badge, rates grid | Happy path |
| 1-2 APIs down, but we got data | Green "LIVE" badge (user doesn't care which API worked) | Transparency without alarm |
| All APIs down, cache exists (<5 min old) | Green "LIVE" badge (cache is still fresh) | User gets data, no reason to worry |
| All APIs down, cache stale (>5 min old) | Yellow "STALE" badge + warning banner | Honest about staleness |
| All APIs down, no cache (cold start) | Red "UNAVAILABLE" error state with retry message | Can't lie, just be clear |

**Design principle:** Never confuse the user. If data is stale, say so. If APIs are down but we have cached data, show the data with context. If we got *nothing*, don't show a cryptic error code — show a friendly "please try again" message.

**Why the color-coded badges?**
Users scan visually. Green = good. Yellow = caution. Red = problem. It's instant communication.

---

## Decision 8: Auto-Refresh Every 30 Seconds

**Frontend polling:**
```javascript
setInterval(fetchRates, 30000)
```

Fetches new data every 30 seconds automatically.

**Why 30 seconds?**
- The backend cache is 5 minutes, so most of these requests hit cache anyway. It's not spamming the APIs.
- Gives the UI a "live" feel without being annoying. Every 10 sec would be overkill (data doesn't change that fast). Every 60 sec felt sluggish in testing.
- If an API comes back online after an outage, we pick it up within 30 sec. Feels responsive.

**Why NOT WebSocket / Server-Sent Events?**
The data doesn't change that often (source APIs update daily). Pushing stale data over a persistent connection is silly. Polling is simpler and totally fine here.

**Could we skip auto-refresh entirely?**
Yeah, but then users have to manually refresh to see if stale data freshened up. The 30-sec poll makes the app feel more alive.

---

## Decision 9: 10 Currency Pairs (USD Base)

**Picked:** EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, MXN, BRL

**Why these?**
Top 10 most-traded currency pairs against USD (roughly). Covers:
- Major economies (EUR, GBP, JPY)
- Regional players (CAD, AUD, CHF)
- Emerging markets (CNY, INR, BRL, MXN)

**Why only 10?**
- Fits nicely on a screen without scrolling.
- All free APIs support these without auth.
- 10 is "substantial" without being overwhelming. If a user needs SGD or THB, that's a pro-tier feature.

**Why USD as base?**
Most common base for free APIs. Supporting multi-base (EUR → JPY, etc.) requires either:
1. Cross-calculation (error-prone)
2. Hitting different API endpoints
3. Paid APIs

Kept it simple. USD base only.

---

## Decision 10: What We Didn't Build (And Why)

| Feature | Why We Cut It |
|---|---|
| Historical rate charts | Requires storing time-series data. Cool feature, but out of scope. The goal was "show current rates reliably," not trend analysis. |
| Currency converter (input $100, get €X) | Would need a form, validation, and... it's just multiplication. Didn't add enough value for the complexity. |
| User accounts / saved preferences | This is public data. No auth needed. Keeping it stateless keeps it simple. |
| Mobile app (React Native) | Web-first. Responsive design works on mobile browsers. Native app is a whole separate deployment/app store headache. |
| Dark mode | Would've been nice. Fluent UI supports it. Just ran out of time. Would add it next. |
| Backend database | All state is in-memory cache. If the server restarts, cache is lost — but it refills on first request. A DB would add persistence we don't actually need. |
| Rate alerts ("notify me when EUR hits 0.85") | Requires user state, background jobs, email/push infra. Way out of scope. |

**Honest take:** I could've spent another day adding charts and converters. But the core value is "show me current rates I can trust." Nailed that. Everything else is nice-to-have.

---

## Decision 11: Deployment Assumptions

**Not deployed yet, but here's the plan:**

**Backend:**
- Heroku/Railway/Render free tier, or AWS Lambda behind API Gateway.
- Environment var for `PORT` (defaults to 3001).
- No DB needed, so no migrations or connection strings.

**Frontend:**
- Vite build outputs static files to `dist/`.
- Deploy to Vercel/Netlify (free tier, dead simple).
- Set `VITE_API_URL` env var to point to backend.

**CORS:**
- Backend already has `cors()` middleware enabled.
- In production, I'd lock it down to only the frontend domain.

**Why these platforms?**
Free tier, zero-config deploy (push to Git, auto-deploy), and I've used them before. Render is slightly nicer than Heroku these days IMO.

---

## Decision 12: Error Handling Philosophy

**Backend errors:**
- API timeouts (5 sec) are caught, logged, and treated as "that API failed."
- If all APIs fail, return 503 with a JSON body (not just a status code). Frontend can parse it and show a message.
- Network errors, JSON parse errors — all caught and logged. Never crash the server.

**Frontend errors:**
- Network request fails? Show the error state component.
- Invalid JSON from backend? Show error state.
- Missing data? Show error state.
- The error state is *designed* to be user-friendly (disconnected plug icon, plain English message). Not a stack trace, not "Error 500."

**Why be so defensive?**
Because we're chaining free APIs that WILL fail sometimes. The app should shrug and handle it, not blow up.

---

## Decision 13: Testing (Or Lack Thereof)

**What we tested:**
- Manual E2E: started both servers, opened browser, clicked around.
- Tested each state: live, stale (by waiting), unavailable (by killing backend).
- Checked responsive design on mobile viewport.

**What we didn't test:**
- Unit tests for resolver logic, cache logic, API fetcher.
- Integration tests for API failure scenarios.
- Load testing (what happens with 100 concurrent requests?).

**Why no tests?**
Time. This was a "build and ship" sprint. Tests would be the first thing I'd add if this became a real product.

**Risk:** A bug in the conflict resolution logic (e.g., averaging when we shouldn't) wouldn't be caught. Mitigated by keeping that code simple (~20 lines) and manually testing edge cases.

---

## What I'd Add Next

**Next 2 hours:**
- Dark mode. Fluent UI supports it, just need to wire up a theme toggle.
- Unit tests for resolver and cache logic.
- Health endpoint (`/api/health`) is already there, but add more metrics (cache hit rate, avg API latency).

**Next sprint:**
- Historical rates (store daily snapshots in SQLite or Postgres).
- Currency converter UI.
- Better error messages (if Frankfurter is down, say "ECB source unavailable" instead of generic error).
- Logging with structure (JSON logs for each API call, latency, success/fail).

**Next quarter (if this became a product):**
- Premium tier: real-time rates via a paid API, exposed behind a feature flag.
- Analytics: track which currencies people look at most, optimize the top 10 list.
- WebSocket support for pro users (push rate updates as they happen).
- Mobile app (React Native using same backend).

---

## Honest Reflections

**What went well:**
- The parallel fetch + caching strategy works great. UI feels snappy even when APIs are slow.
- Fluent UI saved a ton of time. Didn't write a single CSS flexbox for buttons.
- The "be honest about staleness" approach feels right. Users aren't confused.

**What was harder than expected:**
- Getting the conflict resolution logic right. First version always averaged, which broke when one API returned day-old data.
- Fluent UI has a learning curve. Some components (like Dropdown) have weird APIs. Read docs twice.

**What I'd do differently:**
- Start with TypeScript. I used plain JS for speed, but I've already hit a couple bugs from undefined fields. TS would catch that.
- Add logging earlier. Right now errors just console.log. In prod, I'd want structured logs.

**The big question: Does this solve the real problem?**
If the problem is "show reliable forex rates on a budget," yes. If the problem is "convince users to upgrade to premium," that's a product/marketing question. This app gives them accurate free data — which is good for trust — but doesn't create urgency to upgrade. That's by design. The upgrade pitch would be "real-time rates, historical charts, and API access," not "we hide data behind a paywall."

---

## Final Note

This isn't production-grade in the "deployed at scale for thousands of users" sense. But it's production-grade in the "works reliably, handles failures, and ships value" sense. The code is clean, the UX is thought-through, and the architecture is honest about its trade-offs.

If I handed this off to another dev, they could extend it without rewriting. That's the real test.
