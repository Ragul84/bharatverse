// Thin DOM painter for BharatVerse flashcards / review deck (M3).

import type { IWorld } from '../world_api';
import { buildFlashcardsPanelView, type FlashcardsPanelView } from './flashcards_view';
import { t } from './i18n';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class FlashcardsPanel {
  private root: HTMLElement;
  private open = false;
  private lastSig = '';

  constructor(
    private readonly world: () => IWorld,
    host: HTMLElement = document.body,
  ) {
    let el = document.getElementById('flashcards-panel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'flashcards-panel';
      el.className = 'window panel flashcards-panel';
      el.hidden = true;
      host.appendChild(el);
    }
    this.root = el;
    this.root.addEventListener('click', (ev) => {
      const tEl = ev.target as HTMLElement;
      if (tEl.closest('[data-fc-close]')) {
        this.close();
        return;
      }
      if (tEl.closest('[data-fc-start]')) {
        this.world().startRecallReview();
        return;
      }
      if (tEl.closest('[data-fc-study]')) {
        this.world().startStudyHallQuiz();
        return;
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
    const view = buildFlashcardsPanelView({
      due: w.flashcardDueList,
      studyRemaining: w.studySessionRemaining,
    });
    const sig = `${view.dueCount}|${view.studyRemaining}|${view.due.map((d) => d.id).join(',')}`;
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.paint(view);
  }

  private paint(view: FlashcardsPanelView): void {
    const rows = view.due
      .slice(0, 12)
      .map(
        (d) =>
          `<div class="fc-row">` +
          `<div class="fc-prompt">${esc(d.prompt)}</div>` +
          `<div class="fc-meta">${esc(d.subject)} · box ${d.box}</div>` +
          `</div>`,
      )
      .join('');

    const emptyNote = view.empty
      ? `<div class="fc-empty">${esc(t('hudChrome.flashcards.empty'))}</div>`
      : '';

    const sessionNote =
      view.studyRemaining > 0
        ? `<div class="fc-session">${esc(
            t('hudChrome.flashcards.sessionLeft', { n: String(view.studyRemaining) }),
          )}</div>`
        : '';

    this.root.innerHTML =
      `<div class="panel-title">` +
      `<span>${esc(t('hudChrome.flashcards.title'))}</span>` +
      `<button type="button" class="x-btn" data-fc-close aria-label="${esc(t('hudChrome.flashcards.close'))}">×</button>` +
      `</div>` +
      `<div class="fc-sub">${esc(t('hudChrome.flashcards.subtitle', { n: String(view.dueCount) }))}</div>` +
      sessionNote +
      emptyNote +
      `<div class="fc-list">${rows}</div>` +
      `<div class="fc-actions">` +
      `<button type="button" class="btn" data-fc-start${view.empty ? ' disabled' : ''}>${esc(
        t('hudChrome.flashcards.startReview'),
      )}</button>` +
      `<button type="button" class="btn" data-fc-study>${esc(t('hudChrome.flashcards.studyHall'))}</button>` +
      `</div>`;
  }
}
