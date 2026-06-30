# Bharatverse — Production Readiness Checklist

The honest scope for "production-ready, India's #1 educational MMO." This is a
multi-phase program, not a single change. Status: ✅ done · 🟡 in progress ·
⬜ not started · 👤 needs a product/business decision (not pure engineering).

Update this file as items close. Anchor every "done" on a check you can run
(`npx tsc --noEmit`, `npm test`, `npm run build`, the S3 i18n guard).

## 0. Foundation (must always be green)
- ✅ `tsc --noEmit` clean
- ✅ `vite build` green (game + admin entries)
- ✅ S3 i18n guard (`tests/localization_fixes.test.ts`) passing
- 🟡 Full `npm test` green — known slow-test timeouts to triage (threat/talents), not real failures
- ⬜ CI that runs tsc + test + build + i18n release-tier gate on every PR

## 1. Determinism & three-host parity (the core invariant)
- ✅ `pickQuestion` no longer uses `Math.random` (Rng required) — `src/sim/content/questions.ts`
- ⬜ Audit all of `src/sim` + `server/` for wall-clock / `Math.random` (one-off sweep + a lint rule)
- ⬜ Replay/determinism test covering the recall path (same seed ⇒ same questions & outcomes)

## 2. Server authority for recall (M2 — top engineering blocker)
- ⬜ Move recall resolution server-side: server picks the question (seeded Rng), validates
      the answer, awards MindCoins/XP, emits a `SimEvent`. Client only renders + sends intent.
- ⬜ Extend `IWorld` with the recall surface; implement in both `Sim` and `ClientWorld`.
- ⬜ Remove client-side answer grading from `main.ts` / Quiz/Combat scenes.
- ⬜ Anti-cheat: never trust client-reported correctness; rate-limit answer spam.

## 3. Unify the data models (M1/WP4)
- 🟡 Canonical question model = `Question` (NCERT tier 1–6) in `src/sim/content/questions.ts`
- ⬜ Delete the competing `KnowledgeQuestion` shape + `src/sim/knowledge_combat.ts` duplication
- 👤 Pick ONE currency: MindCoins vs Gold/copper (D5). Then collapse to it everywhere.
- ⬜ One question-bank loader shared by sim/server/client (no two sources of truth)

## 4. Content (the heart of an edu product)
- 👤 Curriculum scope: which boards (NCERT/CBSE/state), classes, subjects, exam tiers for v1
- ⬜ Question schema + authoring/import pipeline (CSV/JSON → validated bank), dedupe, tagging
- ⬜ Volume + QA: every question subject-expert-reviewed (wrong facts are unacceptable in edu)
- ⬜ Leitner / spaced-repetition mastery model (M3) driving what each player sees next

## 5. Renderer / UX (M1 — in progress)
- 🟡 Phaser top-down Kenney tile world rendering (ground/water/paths/trees) — verified in-browser
- 🟡 Character art: AI sprites wired; `_v3` + walk-pose pipeline mid-migration (align filenames)
- ⬜ HUD parity (HUDScene), minimap, tooltips, FCT, mobile controls
- ⬜ Map polish: reduce the bare dirt plaza at spawn; align hand-placed buildings with sim hubs
- ⬜ Onboarding/tutorial; first-session retention loop

## 6. Security, moderation, accounts
- ⬜ Auth hardening, session/rate limits, parameterized SQL audit (server is authoritative)
- ⬜ `ALLOW_DEV_COMMANDS` provably off in prod; secrets only via env, never committed
- ⬜ Chat moderation + reporting for a minors-facing product
- 👤 COPPA / India DPDP Act compliance for under-18 users (consent, data minimization, retention)

## 7. i18n (release-tier)
- ✅ Contributor flow: English-only PRs legal; keys via `t()`
- ⬜ Release gate: every locale filled (`I18N_RELEASE_TIER=1` hard-fails on `pending`)
- 👤 Confirm launch locale set (Hindi + regional Indian languages prioritised)

## 8. Ops / launch
- 👤 Hosting, realm scaling, Postgres sizing/backups, monitoring/alerting, cost budget
- ⬜ Load test (interest-scoped snapshots at target CCU)
- 👤 Monetization model (if any) + store/PWA distribution
- 👤 Legal: ToS, privacy policy, content licensing (assets are CC0 — keep CREDITS.md current)

## Suggested execution order (engineering)
1. Stabilize foundation + CI (§0)
2. Server-authoritative recall (§2) + determinism audit (§1)
3. Unify data models + currency (§3)
4. Content pipeline + Leitner (§4, §M3)
5. HUD/UX parity + map polish (§5)
6. Security/moderation/compliance (§6) → i18n release gate (§7) → ops/launch (§8)
