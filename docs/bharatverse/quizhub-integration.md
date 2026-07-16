# BharatVerse ← quizhub (mindwhite) — quiz content integration design

The quiz corpus is **already built** in the mindwhite app (`C:\mindwhite`), stored in
**Upstash Redis** and surfaced by its **Quiz Hub** tool (`app/quiz-hub/index.tsx`:
Exam/Class → Subject → Topic → reader). BharatVerse **ingests** this — no authoring.
Source of truth analyzed 2026-07-16 from `utils/redisService.ts` + `utils/quizQuestionTypes.ts`.

## Redis data model (Upstash, REST API)
| Key | Type | Holds |
|---|---|---|
| `quiz:subject:{key}` | **LIST** | the questions — JSON strings; read `LRANGE key 0 -1`, count `LLEN` |
| `quiz:ids:{key}` | SET | question-id dedup |
| `quiz:textnorm:{key}` | SET | normalized-text dedup |
| `quiz:exams` | JSON string | `QuizExam[]` nav |
| `quiz:subjects:{examId}` | JSON string | `QuizSubject[]` nav |
| `quiz:topics:{examId}:{subjectId}` | JSON string | `QuizTopic[]` nav |

`{key}` = a subject code (`history, maths, polity, economics, geography, science,
english, tamil, reasoning, physics, chemistry, biology, computer, current_affairs,
banking, environment, …`), sometimes composed as `{subject}:{exam}:{topic|classN}`.
Full keys may already be prefixed `quiz:subject:…`.

## Exams / subjects taxonomy already present
Exams: **TNPSC, UPSC, SSC, RRB/Railway, Banking, Defence (NDA/CDS/AFCAT), Teaching
(CTET/TET), Management (CAT/MAT), Samacheer 6–12, NCERT 6–12.** Each maps subjects →
topics with `difficulty` (easy=Class6-8, medium=9-10, hard=11-12/competitive) and
`questionCount`. School exams (ncert/samacheer) use a **Class** step instead of subject.

## Question shape — `QuizQuestionEnvelope` (9 types)
`mcq · multi_statement · assertion_reason · match · sequence · fill_blank ·
true_false · short_answer · passage`. Key fields: `id, question_text|question|prompt,
question_type, options[], answer_index|answer_key[], explanation, difficulty,
statements[], pairs[], items[], sequence[], blank_answer|answer_text, passage,
media{type,uri,caption}, source, subject, class, exam_types[]`.

**Reusable logic already written in `quizQuestionTypes.ts` (port it):**
- `normalizeQuizQuestion(raw)` — cleans varied shapes (e.g. `correct_answer` vs
  `answer_index`) into the envelope. Pure — port into a BharatVerse pure module.
- `evaluateQuizQuestion(q, response)` — server-safe answer checking per type. Port to
  the **server** for anti-cheat validation.
- `inferQuestionType(q)` — fills missing `question_type`.

## BharatVerse integration architecture
1. **Sync job (server-side, out of the tick):** connect Upstash via REST
   (`UPSTASH_REDIS_REST_URL` + `_TOKEN`, in the **server `.env`**, never committed),
   `SCAN`/`LRANGE` every `quiz:subject:*`, normalize, and write an **immutable, versioned
   catalog snapshot** (question-id → normalized question, indexed by subject/exam/topic/
   difficulty and by BharatVerse **Learning Goal**). Refresh on a schedule; the running
   game always reads a fixed snapshot version.
2. **Deterministic selection (sim, `src/sim/`):** `Rng`-seeded `pickQuestion` over the
   snapshot's id index for the active subject/topic/difficulty. **Never calls Redis
   mid-tick** → determinism + "same seed ⇒ same order" preserved.
3. **Server-authoritative validation:** the client submits `{questionId, response,
   timingMs}`; the server looks up the question in the snapshot and runs the ported
   `evaluateQuizQuestion` → correctness + answer-quality → damage/yield/XP. Client never
   sees the answer key until after (anti-cheat).
4. **Explanations** flow to the post-answer review (Study Hall / reader) — learning, not
   just scoring.
5. **Question-type rollout:** `mcq` first (the bulk), then `true_false`/`multi_statement`,
   then `match`/`sequence`/`assertion_reason`/`fill_blank`/`passage`.

## Mapping quizhub → BharatVerse concepts
- quizhub **Exam/Class** → a BharatVerse **Learning Goal** (universal: any exam, class,
  or self-set goal).
- quizhub **Subject** → a **Subject Mastery** track + a gathering/combat activity.
- quizhub **Topic** (+difficulty) → a node/mob tier + the question pool for that activity.
- quizhub **difficulty** (easy/medium/hard) → the 4-lands question-tier bands.

## What's needed to run the live sync (M0)
`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` placed in the BharatVerse **server
`.env`** (server-side only, never in the client bundle, never committed). Until then, M0
is built + tested against a small fixture modeled on the envelope above, then pointed at
the live snapshot with zero rework.
