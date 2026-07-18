// Apply M-Trim: hide player-facing entry points for cut systems and crypto.
// DOM-only; safe to call once after the static shell is in the document.
// Feature truth lives in src/sim/bharatverse_features.ts.

import { BV_FEATURES } from '../sim/bharatverse_features';

/** Element ids to hide when the matching feature is off. */
const TRIM_IDS: ReadonlyArray<{ id: string; whenOff: keyof typeof BV_FEATURES }> = [
  // Ranked arena chrome
  { id: 'mm-arena', whenOff: 'rankedArena' },
  { id: 'mobile-arena', whenOff: 'rankedArena' },
  { id: 'arena-window', whenOff: 'rankedArena' },
  { id: 'arena-status', whenOff: 'rankedArena' },
  // Vale Cup
  { id: 'mm-valecup', whenOff: 'valeCup' },
  { id: 'mobile-valecup', whenOff: 'valeCup' },
  // Delves
  { id: 'delve-tracker', whenOff: 'delves' },
  { id: 'delve-board', whenOff: 'delves' },
  { id: 'delve-rite-panel', whenOff: 'delves' },
  // Crypto / Claudium / WOC store
  { id: 'daily-rewards-button', whenOff: 'claudiumStore' },
  { id: 'mobile-daily-rewards', whenOff: 'claudiumStore' },
  { id: 'wallet-connect-btn', whenOff: 'cryptoWallet' },
  { id: 'cs-wallet-panel', whenOff: 'cryptoWallet' },
  { id: 'account-wallet-section', whenOff: 'cryptoWallet' },
];

/** CSS selectors for broader wallet / store / donate chrome (class-based). */
const TRIM_SELECTORS: ReadonlyArray<{ selector: string; whenOff: keyof typeof BV_FEATURES }> = [
  { selector: '.cs-wallet', whenOff: 'cryptoWallet' },
  { selector: '#account-panel [data-wallet-section]', whenOff: 'cryptoWallet' },
  { selector: '.community-link.donate', whenOff: 'cryptoWallet' },
  { selector: 'a.donate-cta', whenOff: 'cryptoWallet' },
  { selector: 'a.social-link.donate', whenOff: 'cryptoWallet' },
  { selector: '#desktop-download-panel', whenOff: 'cryptoWallet' },
];

function hideEl(el: Element | null): void {
  if (!el || !(el instanceof HTMLElement)) return;
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
  el.style.display = 'none';
}

/**
 * Hide HUD / shell controls for features disabled in BV_FEATURES.
 * Idempotent. Does not remove nodes (keeps keybind targets from throwing if
 * code still queries them; hidden + display:none is enough for players).
 */
export function applyBharatverseSurfaceTrim(doc: Document = document): void {
  for (const row of TRIM_IDS) {
    if (BV_FEATURES[row.whenOff]) continue;
    hideEl(doc.getElementById(row.id));
  }
  for (const row of TRIM_SELECTORS) {
    if (BV_FEATURES[row.whenOff]) continue;
    for (const el of doc.querySelectorAll(row.selector)) hideEl(el);
  }

  // Desktop download block is upstream packaging; hide the whole card if present.
  const desktopCard =
    doc.getElementById('desktop-downloads') ?? doc.querySelector('.desktop-downloads');
  if (desktopCard instanceof HTMLElement) hideEl(desktopCard);

  // Mark the document so CSS can further collapse empty chrome.
  doc.documentElement.dataset.bvTrim = '1';
  if (!BV_FEATURES.rankedArena) doc.documentElement.dataset.bvNoArena = '1';
  if (!BV_FEATURES.delves) doc.documentElement.dataset.bvNoDelves = '1';
  if (!BV_FEATURES.cryptoWallet) doc.documentElement.dataset.bvNoWallet = '1';
  if (!BV_FEATURES.valeCup) doc.documentElement.dataset.bvNoValeCup = '1';
}

/** Whether a HUD keybind / mobile action should be ignored under M-Trim. */
export function bvActionAllowed(
  action: 'arena' | 'dungeonFinder' | 'valecup' | 'dailyRewards' | 'delve',
): boolean {
  switch (action) {
    case 'arena':
      return BV_FEATURES.rankedArena || BV_FEATURES.fiesta || BV_FEATURES.protectYumi;
    case 'dungeonFinder':
      return BV_FEATURES.dungeonFinder;
    case 'valecup':
      return BV_FEATURES.valeCup;
    case 'dailyRewards':
      return BV_FEATURES.claudiumStore || BV_FEATURES.dailyRewardsWoc;
    case 'delve':
      return BV_FEATURES.delves;
    default:
      return true;
  }
}
