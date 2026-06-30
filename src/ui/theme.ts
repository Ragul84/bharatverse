// BharatVerse Design System
// Import this wherever UI color tokens are needed.
// All values are CSS-compatible strings.

export const BHARATVERSE_THEME = {
  // ── Core background layers ────────────────────────────────────────────────
  deepNight:    '#080C18',   // absolute background (canvas void)
  surface:      '#0D1425',   // panels, modals, cards
  panel:        '#111827',   // secondary panel
  panelHover:   '#1A2235',   // panel hover state
  border:       'rgba(245,197,24,0.15)',  // gold-tinted border
  borderStrong: 'rgba(245,197,24,0.35)',  // hover/focus border

  // ── Accent colors — Indian identity ───────────────────────────────────────
  saffron:      '#FF6B00',  // primary — saffron (tiranga top stripe)
  gold:         '#F5C518',  // XP, coins, Gyan Sikka
  chakraBlue:   '#4FC3F7',  // MIGA, premium, info (Ashoka chakra inspired)
  emerald:      '#10B981',  // correct answers, health
  crimson:      '#EF4444',  // wrong answers, boss damage
  violet:       '#8B5CF6',  // rare items, Chakra Gems
  ashoka:       '#1B3A6B',  // deep blue accent (Ashoka's navy)
  ivory:        '#E8E4D9',  // primary text (aged parchment)
  muted:        '#6B7280',  // secondary text, hints
  faint:        '#374151',  // very subtle dividers

  // ── Gradients ─────────────────────────────────────────────────────────────
  gradientSaffronGold:  'linear-gradient(135deg, #F5C518, #FF6B00)',
  gradientMIGA:         'linear-gradient(135deg, #0891B2, #7C3AED)',
  gradientKnowledge:    'linear-gradient(135deg, #10B981, #4FC3F7)',

  // ── Typography ────────────────────────────────────────────────────────────
  fontDisplay:  "'Cinzel Decorative', 'Cinzel', Georgia, serif",    // kingdom names, boss names, title
  fontUI:       "'Inter', system-ui, sans-serif",                    // HUD, menus, chat
  fontMono:     "'JetBrains Mono', 'Fira Code', monospace",          // stats, timers, counters

  // ── Semantic UI tokens ────────────────────────────────────────────────────
  hpColor:      '#EF4444',  // health bar
  manaColor:    '#4FC3F7',  // mana bar (chakra blue)
  xpColor:      '#FF6B00',  // XP bar (saffron)
  rageColor:    '#EF4444',  // rage bar
  energyColor:  '#F5C518',  // energy bar (gold)
  comboColor:   '#FF6B00',  // combo counter

  // ── Knowledge combat tokens ───────────────────────────────────────────────
  correct:      '#10B981',  // correct answer highlight
  incorrect:    '#EF4444',  // wrong answer highlight
  timerSafe:    '#10B981',  // timer bar > 50%
  timerWarn:    '#F5C518',  // timer bar 25-50%
  timerCrit:    '#EF4444',  // timer bar < 25%

  // ── Class colors ─────────────────────────────────────────────────────────
  classBrahmarishi: '#FFFFFF',  // white — divine wisdom
  classKshatriya:   '#C79C6E',  // tan/gold — warrior
  classVaishya:     '#FFF569',  // yellow — merchant gold
  classShilpi:      '#0070DE',  // electric blue — engineer
  classVaidya:      '#FF7D0A',  // orange — nature/life

  // ── Glow / shadow ────────────────────────────────────────────────────────
  glowSaffron:  '0 0 30px rgba(255,107,0,0.3)',
  glowGold:     '0 0 20px rgba(245,197,24,0.2)',
  glowCyan:     '0 0 20px rgba(79,195,247,0.2)',
  shadow:       '0 8px 32px rgba(0,0,0,0.5)',
} as const;

// Subject badge colors
export const SUBJECT_COLORS: Record<string, string> = {
  history:   '#F5C518',  // gold — ancient
  science:   '#10B981',  // emerald — life
  math:      '#4FC3F7',  // cyan — logic
  geography: '#34D399',  // green — earth
  economics: '#F97316',  // orange — trade
  biology:   '#22C55E',  // green — life science
  physics:   '#60A5FA',  // blue — force
  chemistry: '#A78BFA',  // violet — elements
  general:   '#F5C518',  // default gold
};

// Combo tier styling
export const COMBO_TIERS = [
  { min: 10, label: '⚡ BRAHMA MODE', color: '#FF6B00', glow: '0 0 20px rgba(255,107,0,0.6)' },
  { min: 5,  label: '🔥 GYAN SURGE', color: '#F5C518', glow: '0 0 16px rgba(245,197,24,0.5)' },
  { min: 3,  label: '✨ GYANI',       color: '#4FC3F7', glow: 'none' },
] as const;

export function getComboStyle(combo: number) {
  return COMBO_TIERS.find(t => combo >= t.min) ?? null;
}
