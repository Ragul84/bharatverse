// BharatVerse Question API — server/questions.ts
// Generates NCERT curriculum questions via Claude Haiku.
// Also handles MIGA tutor explanations for wrong answers.

import Anthropic from '@anthropic-ai/sdk';
import type { Question, Subject, QuestionTier } from '../src/sim/content/questions';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });

// In-memory question cache. In production, replace with Supabase/Postgres.
const questionCache = new Map<string, Question[]>();

// Subject → curriculum context mapping (NCERT aligned)
const SUBJECT_CONTEXT: Record<string, string> = {
  history:   'Indian History — Ancient, Medieval, Modern. NCERT Classes 6-12. Includes Indus Valley, Mughal Empire, Freedom Struggle, Constitution.',
  science:   'General Science — NCERT Classes 6-10. Physics, Chemistry, Biology basics. Real-world applications.',
  maths:     'Mathematics — NCERT Classes 6-10. Arithmetic, Algebra, Geometry, Statistics. Word problems included.',
  geography: 'Indian and World Geography — NCERT Classes 6-12. Rivers, mountains, climate, resources, population.',
  civics:    'Civics and Government — NCERT Classes 6-12. Citizens rights, constitution, democratic systems, local governance.',
  biology:   'Biology — NCERT Classes 9-12. Cell biology, genetics, evolution, human body systems, ecology.',
  physics:   'Physics — NCERT Classes 9-12. Motion, force, electricity, magnetism, optics, modern physics.',
  chemistry: 'Chemistry — NCERT Classes 9-12. Periodic table, chemical reactions, acids/bases, organic chemistry.',
  current_affairs: 'General Knowledge & Current Affairs — India, world affairs, sports, culture, current events relevant to Classes 6-12.',
};

export async function getRandomQuestion(subject: string, difficulty = 3): Promise<Question> {
  const key = `${subject}_${difficulty}`;
  const pool = questionCache.get(key) ?? [];

  // Use cached question 60% of the time to reduce API calls
  if (pool.length >= 3 && Math.random() < 0.6) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const context = SUBJECT_CONTEXT[subject.toLowerCase()] ?? SUBJECT_CONTEXT['current_affairs'];
  const diffDesc = [
    '', 'easy recall (Class 6-7 level)',
    'basic understanding (Class 7-8)',
    'applied knowledge (Class 9-10)',
    'analytical (Class 11-12)',
    'challenge — JEE/NEET/UPSC level',
  ][difficulty] ?? 'medium';

  const tierVal = Math.max(1, Math.min(6, difficulty)) as QuestionTier;

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Generate a BharatVerse educational game question. Return ONLY valid JSON, no markdown, no explanation.

Curriculum: ${context}
Difficulty/Tier: ${tierVal}/6 — ${diffDesc}
Language: English (Indian English spelling acceptable)

Required JSON format:
{
  "id": "q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}",
  "subject": "${subject}",
  "tier": ${tierVal},
  "ncert_class": ${6 + tierVal - 1},
  "question": "clear question text here (1-2 sentences max)",
  "options": {
    "a": "option A text",
    "b": "option B text",
    "c": "option C text",
    "d": "option D text"
  },
  "correct": "a",
  "explanation": "2 sentence explanation of why the correct answer is right, with educational context",
  "time_limit_seconds": 30,
  "mindcoins_reward": 5,
  "source": "ncert"
}

Rules:
- Factually accurate per NCERT syllabus
- All 4 options must be plausible (no obviously wrong answers)
- Explanation must be educational and memorable
- No political opinions or controversial topics
- Questions must be self-contained (no "in the passage above" references)`,
    }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';

  // Strip any markdown fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const q = JSON.parse(cleaned) as Question;

  // Add to pool
  const updated = [...pool, q].slice(-20); // keep last 20 per subject/difficulty
  questionCache.set(key, updated);

  return q;
}

export async function getMIGAExplanation(
  question: string,
  chosen: string,
  correct: string,
  explanation: string,
): Promise<string> {
  const response = await claude.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 180,
    messages: [{
      role: 'user',
      content: `You are MIGA, a friendly and encouraging cyan wolf AI tutor inside BharatVerse — India's educational MMO.
A student just got a question wrong. Give a SHORT (2 sentences max) encouraging explanation.

Use game-flavoured language: "warrior", "scholar", "your quest", "Guru Shukracharya says".
Be warm and motivating. Never condescending. Start with "Almost there!" or "Good try!".
Never start with "I". Do not use markdown.

Question: ${question}
Student chose: ${chosen}
Correct answer: ${correct}
Core concept: ${explanation}`,
    }],
  });

  return response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : 'Almost there, warrior! Review this concept and you will master it on your next quest!';
}
