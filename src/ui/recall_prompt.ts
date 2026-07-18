// Thin DOM painter for the BharatVerse recall power-moment panel.
// Reads IWorld.recallPrompt / recallLastResult; submits via world.answerRecall.

import type { IWorld } from '../world_api';
import { t } from './i18n';
import { buildRecallPromptView, type RecallPromptView } from './recall_prompt_view';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class RecallPromptPanel {
  private root: HTMLElement;
  private shownAtMs = 0;
  private lastSig = '';
  private flashUntilMs = 0;

  constructor(
    private readonly world: () => IWorld,
    host: HTMLElement = document.body,
  ) {
    let el = document.getElementById('recall-prompt');
    if (!el) {
      el = document.createElement('div');
      el.id = 'recall-prompt';
      el.className = 'recall-prompt panel';
      el.hidden = true;
      host.appendChild(el);
    }
    this.root = el;
    this.root.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest('[data-recall-opt]') as HTMLElement | null;
      if (!btn) return;
      const idx = Number(btn.getAttribute('data-recall-opt'));
      if (!Number.isFinite(idx)) return;
      const timingMs = this.shownAtMs > 0 ? Math.max(0, Date.now() - this.shownAtMs) : 0;
      this.world().answerRecall(idx, timingMs);
    });
  }

  /** Per-frame paint (write-elided by signature). */
  update(): void {
    const w = this.world();
    // Client wall-clock for the countdown bar (IWorld has no sim-time read).
    // The server still enforces TIMEOUT_S via sim time.
    const nowProxy =
      w.recallPrompt && this.shownAtMs > 0
        ? w.recallPrompt.expiresAt - Math.max(0, 18 - (Date.now() - this.shownAtMs) / 1000)
        : 0;
    const view = buildRecallPromptView({
      prompt: w.recallPrompt,
      lastResult: w.recallLastResult,
      combo: w.recallCombo,
      now: nowProxy,
    });
    if (view.open && this.shownAtMs === 0) this.shownAtMs = Date.now();
    if (!view.open) this.shownAtMs = 0;

    // Keep result flash visible briefly after answer.
    if (view.lastResult && !view.open) {
      if (this.flashUntilMs === 0) this.flashUntilMs = Date.now() + 3200;
    } else if (view.open) {
      this.flashUntilMs = 0;
    }
    const showFlash = !view.open && !!view.lastResult && Date.now() < this.flashUntilMs;
    const sig = this.sig(view, showFlash);
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.paint(view, showFlash);
  }

  private sig(view: RecallPromptView, showFlash: boolean): string {
    return [
      view.open ? '1' : '0',
      view.prompt,
      view.options.join('|'),
      view.timeFrac.toFixed(2),
      view.combo,
      showFlash ? 'f' : '',
      view.lastResult
        ? `${view.lastResult.correct}:${view.lastResult.powerMult}:${view.lastResult.explanation}`
        : '',
    ].join('~');
  }

  private paint(view: RecallPromptView, showFlash: boolean): void {
    if (!view.open && !showFlash) {
      this.root.hidden = true;
      this.root.innerHTML = '';
      return;
    }
    this.root.hidden = false;
    if (view.open) {
      const opts = view.options
        .map(
          (o, i) =>
            `<button type="button" class="btn recall-opt" data-recall-opt="${i}">${esc(o)}</button>`,
        )
        .join('');
      this.root.innerHTML =
        `<div class="panel-title">${esc(t('hudChrome.recall.title'))}</div>` +
        `<div class="recall-meta">${esc(t('hudChrome.recall.subject', { subject: view.subject }))}` +
        (view.combo > 0
          ? ` · ${esc(t('hudChrome.recall.combo', { n: String(view.combo) }))}`
          : '') +
        `</div>` +
        `<div class="recall-q">${esc(view.prompt)}</div>` +
        `<div class="recall-timer"><div class="recall-timer-fill" style="width:${Math.round(view.timeFrac * 100)}%"></div></div>` +
        `<div class="recall-opts">${opts}</div>` +
        `<div class="recall-hint">${esc(t('hudChrome.recall.hint'))}</div>`;
      return;
    }
    if (showFlash && view.lastResult) {
      const r = view.lastResult;
      const headline = r.correct
        ? r.isCrit
          ? t('hudChrome.recall.result.crit')
          : t('hudChrome.recall.result.correct')
        : t('hudChrome.recall.result.wrong');
      const power = t('hudChrome.recall.result.power', {
        mult: r.powerMult.toFixed(2),
      });
      this.root.innerHTML =
        `<div class="panel-title">${esc(headline)}</div>` +
        `<div class="recall-q">${esc(view.prompt)}</div>` +
        `<div class="recall-meta">${esc(power)}</div>` +
        (r.explanation ? `<div class="recall-explain">${esc(r.explanation)}</div>` : '');
    }
  }
}
