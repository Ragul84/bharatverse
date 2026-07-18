// Thin DOM painter for the Subject Mastery panel (BharatVerse M1).
// Reads IWorld mastery + review due; Review starts a due-card power-moment.

import type { IWorld } from '../world_api';
import { t } from './i18n';
import { buildMasteryPanelView, type MasteryPanelView } from './mastery_panel_view';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function subjectLabel(subject: string): string {
  if (subject === 'gk') return t('hudChrome.mastery.subjects.gk');
  if (subject === 'science') return t('hudChrome.mastery.subjects.science');
  if (subject === 'maths') return t('hudChrome.mastery.subjects.maths');
  if (subject === 'history') return t('hudChrome.mastery.subjects.history');
  return subject;
}

export class MasteryPanel {
  private root: HTMLElement;
  private open = false;
  private lastSig = '';

  constructor(
    private readonly world: () => IWorld,
    host: HTMLElement = document.body,
  ) {
    let el = document.getElementById('mastery-panel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mastery-panel';
      el.className = 'window panel mastery-panel';
      el.hidden = true;
      host.appendChild(el);
    }
    this.root = el;
    this.root.addEventListener('click', (ev) => {
      const tEl = ev.target as HTMLElement;
      if (tEl.closest('[data-mastery-close]')) {
        this.close();
        return;
      }
      if (tEl.closest('[data-mastery-review]')) {
        this.world().startRecallReview();
      }
    });
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  show(): void {
    this.open = true;
    this.root.hidden = false;
    this.lastSig = '';
    this.update();
  }

  close(): void {
    this.open = false;
    this.root.hidden = true;
    this.root.innerHTML = '';
    this.lastSig = '';
  }

  update(): void {
    if (!this.open) return;
    const w = this.world();
    const view = buildMasteryPanelView({
      mastery: w.masteryBySubject,
      dueCount: w.reviewDueCount,
      combo: w.recallCombo,
    });
    const sig = this.sig(view);
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.paint(view);
  }

  private sig(view: MasteryPanelView): string {
    return [
      view.dueCount,
      view.combo,
      ...view.rows.map((r) => `${r.subject}:${r.level}:${r.tier}:${r.progress.toFixed(2)}`),
    ].join('|');
  }

  private paint(view: MasteryPanelView): void {
    const rows = view.rows
      .map((r) => {
        const pct = Math.round(r.progress * 100);
        const xpLine =
          r.xpForLevel === null
            ? t('hudChrome.mastery.maxed')
            : t('hudChrome.mastery.xpLine', {
                into: String(r.xpIntoLevel),
                need: String(r.xpForLevel),
              });
        return (
          `<div class="mastery-row">` +
          `<div class="mastery-row-head">` +
          `<span class="mastery-subject">${esc(subjectLabel(r.subject))}</span>` +
          `<span class="mastery-lvl">${esc(
            t('hudChrome.mastery.levelTier', {
              level: String(r.level),
              tier: String(r.tier),
            }),
          )}</span>` +
          `</div>` +
          `<div class="mastery-bar"><div class="mastery-bar-fill" style="width:${pct}%"></div></div>` +
          `<div class="mastery-xp">${esc(xpLine)}</div>` +
          `</div>`
        );
      })
      .join('');

    const reviewDisabled = view.dueCount <= 0 ? ' disabled' : '';
    const reviewLabel =
      view.dueCount > 0
        ? t('hudChrome.mastery.reviewDue', { n: String(view.dueCount) })
        : t('hudChrome.mastery.reviewNone');

    this.root.innerHTML =
      `<div class="panel-title">` +
      `<span>${esc(t('hudChrome.mastery.title'))}</span>` +
      `<button type="button" class="x-btn" data-mastery-close aria-label="${esc(t('hudChrome.mastery.close'))}">×</button>` +
      `</div>` +
      `<div class="mastery-sub">${esc(
        t('hudChrome.mastery.subtitle', { combo: String(view.combo) }),
      )}</div>` +
      `<div class="mastery-rows">${rows}</div>` +
      `<div class="mastery-actions">` +
      `<button type="button" class="btn" data-mastery-review${reviewDisabled}>${esc(reviewLabel)}</button>` +
      `</div>`;
  }
}
