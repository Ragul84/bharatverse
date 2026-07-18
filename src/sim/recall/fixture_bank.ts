// Built-in recall question bank used until the live quizhub Redis sync lands.
// Pure, host-agnostic. MCQ only for M0. Replace via setRecallBank() on the host
// when a versioned catalog snapshot is available (docs/bharatverse/quizhub-integration.md).

import { buildQuestionBank, type QuestionBank } from './question_bank';

const FIXTURE_ENTRIES = [
  {
    poolKey: 'gk:easy',
    raw: {
      id: 'gk_capital',
      question: 'What is the capital of India?',
      type: 'mcq',
      options: ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'],
      correct_answer: 1,
      explanation: 'New Delhi is the capital of India.',
      difficulty: 'easy',
      subject: 'gk',
    },
  },
  {
    poolKey: 'gk:easy',
    raw: {
      id: 'gk_tricolor',
      question: 'How many colours are on the Indian national flag?',
      type: 'mcq',
      options: ['Two', 'Three', 'Four', 'Five'],
      correct_answer: 1,
      explanation: 'Saffron, white, and green, with the navy blue Ashoka Chakra.',
      difficulty: 'easy',
      subject: 'gk',
    },
  },
  {
    poolKey: 'gk:easy',
    raw: {
      id: 'gk_river',
      question: 'Which river is considered sacred in many Indian traditions?',
      type: 'mcq',
      options: ['Nile', 'Amazon', 'Ganga', 'Thames'],
      correct_answer: 2,
      explanation: 'The Ganga (Ganges) is a major sacred river of the Indian subcontinent.',
      difficulty: 'easy',
      subject: 'gk',
    },
  },
  {
    poolKey: 'gk:easy',
    raw: {
      id: 'gk_planet',
      question: 'Which planet is known as the Red Planet?',
      type: 'mcq',
      options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
      correct_answer: 1,
      explanation: 'Mars appears reddish because of iron oxide on its surface.',
      difficulty: 'easy',
      subject: 'gk',
    },
  },
  {
    poolKey: 'science:easy',
    raw: {
      id: 'sci_h2o',
      question: 'What is the chemical formula for water?',
      type: 'mcq',
      options: ['CO2', 'H2O', 'O2', 'NaCl'],
      correct_answer: 1,
      explanation: 'Water is two hydrogen atoms bonded to one oxygen atom: H2O.',
      difficulty: 'easy',
      subject: 'science',
    },
  },
  {
    poolKey: 'science:easy',
    raw: {
      id: 'sci_photosynthesis',
      question: 'Plants make food mainly using which process?',
      type: 'mcq',
      options: ['Respiration', 'Photosynthesis', 'Digestion', 'Fermentation'],
      correct_answer: 1,
      explanation: 'Photosynthesis converts light energy into chemical energy in plants.',
      difficulty: 'easy',
      subject: 'science',
    },
  },
  {
    poolKey: 'maths:easy',
    raw: {
      id: 'math_square',
      question: 'What is 12 x 12?',
      type: 'mcq',
      options: ['124', '144', '132', '156'],
      correct_answer: 1,
      explanation: '12 squared is 144.',
      difficulty: 'easy',
      subject: 'maths',
    },
  },
  {
    poolKey: 'maths:easy',
    raw: {
      id: 'math_half',
      question: 'What is half of 98?',
      type: 'mcq',
      options: ['48', '49', '50', '51'],
      correct_answer: 1,
      explanation: '98 divided by 2 is 49.',
      difficulty: 'easy',
      subject: 'maths',
    },
  },
  {
    poolKey: 'history:easy',
    raw: {
      id: 'hist_independence',
      question: 'In which year did India gain independence?',
      type: 'mcq',
      options: ['1945', '1947', '1950', '1952'],
      correct_answer: 1,
      explanation: 'India became independent on 15 August 1947.',
      difficulty: 'easy',
      subject: 'history',
    },
  },
  {
    poolKey: 'history:easy',
    raw: {
      id: 'hist_republic',
      question: 'When is Republic Day celebrated in India?',
      type: 'mcq',
      options: ['15 August', '2 October', '26 January', '14 November'],
      correct_answer: 2,
      explanation: 'Republic Day marks 26 January 1950, when the Constitution came into force.',
      difficulty: 'easy',
      subject: 'history',
    },
  },
] as const;

/** Default bank version stamp (fixture until quizhub sync). */
export const FIXTURE_BANK_VERSION = 'fixture-m0-v1';

/** Immutable default bank for offline + online until Redis catalog is wired. */
export const DEFAULT_RECALL_BANK: QuestionBank = buildQuestionBank(
  FIXTURE_BANK_VERSION,
  FIXTURE_ENTRIES as unknown as { poolKey: string; raw: unknown }[],
);

/** Pool keys used to rotate power-moments across subjects. */
export const RECALL_POOL_ROTATION = [
  'gk:easy',
  'science:easy',
  'maths:easy',
  'history:easy',
] as const;
