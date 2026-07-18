// Thin DOM painter for BharatVerse hub building overlays (Guru, Study Hall, etc.).

import { LEARNING_GOALS } from '../sim/content/bharatverse_goals';
import type { BvBuildingKind } from '../sim/content/bharatverse_hub';
import {
  filterLibraryChapters,
  LIBRARY_CHAPTERS,
  libraryFilterOptions,
} from '../sim/content/bharatverse_library';
import type { IWorld } from '../world_api';
import { buildHubBuildingView, type HubBuildingView } from './hub_building_view';
import { t } from './i18n';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeT(key: string, values?: Record<string, string>): string {
  try {
    return t(key as never, values as never);
  } catch {
    return key;
  }
}

export class HubBuildingPanel {
  private root: HTMLElement;
  private openKind: BvBuildingKind | null = null;
  private selectedChapterId: string | null = null;
  private libraryBoard: string | null = null;
  private librarySubject: string | null = null;
  private lastSig = '';

  constructor(
    private readonly world: () => IWorld,
    host: HTMLElement = document.body,
  ) {
    let el = document.getElementById('hub-building-panel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hub-building-panel';
      el.className = 'window panel hub-building-panel';
      el.hidden = true;
      host.appendChild(el);
    }
    this.root = el;
    this.root.addEventListener('click', (ev) => {
      const tEl = ev.target as HTMLElement;
      if (tEl.closest('[data-hub-close]')) {
        this.close();
        return;
      }
      const goal = tEl.closest('[data-hub-goal]') as HTMLElement | null;
      if (goal) {
        const id = goal.getAttribute('data-hub-goal');
        if (id) this.world().setLearningGoal(id);
        this.lastSig = '';
        this.update();
        return;
      }
      const ch = tEl.closest('[data-hub-chapter]') as HTMLElement | null;
      if (ch) {
        this.selectedChapterId = ch.getAttribute('data-hub-chapter');
        this.lastSig = '';
        this.update();
        return;
      }
      const board = tEl.closest('[data-hub-board]') as HTMLElement | null;
      if (board) {
        const v = board.getAttribute('data-hub-board');
        this.libraryBoard = v === '' || v === null ? null : v;
        this.lastSig = '';
        this.update();
        return;
      }
      const subj = tEl.closest('[data-hub-subject]') as HTMLElement | null;
      if (subj) {
        const v = subj.getAttribute('data-hub-subject');
        this.librarySubject = v === '' || v === null ? null : v;
        this.lastSig = '';
        this.update();
        return;
      }
      if (tEl.closest('[data-hub-study]')) {
        this.world().startStudyHallQuiz();
        this.close();
        return;
      }
      if (tEl.closest('[data-hub-review]')) {
        this.world().startRecallReview();
        this.close();
      }
    });
  }

  get isOpen(): boolean {
    return this.openKind !== null;
  }

  open(kind: BvBuildingKind): void {
    this.openKind = kind;
    this.root.hidden = false;
    this.lastSig = '';
    this.update();
  }

  close(): void {
    this.openKind = null;
    this.root.hidden = true;
    this.root.innerHTML = '';
    this.lastSig = '';
  }

  update(): void {
    if (!this.openKind) return;
    const w = this.world();
    const chapters = filterLibraryChapters(LIBRARY_CHAPTERS, {
      board: this.libraryBoard,
      subject: this.librarySubject,
    });
    const view = buildHubBuildingView({
      kind: this.openKind,
      goals: LEARNING_GOALS,
      activeGoalId: w.learningGoalId,
      chapters,
      selectedChapterId: this.selectedChapterId,
      mastery: w.masteryBySubject,
      dueCount: w.reviewDueCount,
    });
    const sig = JSON.stringify(view);
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.paint(view);
  }

  private paint(view: HubBuildingView): void {
    const title = esc(safeT(view.titleKey));
    const body = esc(safeT(view.bodyKey));
    let bodyHtml = `<div class="hub-body">${body}</div>`;

    if (view.kind === 'guru' && view.goals) {
      const goals = view.goals
        .map((g) => {
          const active = g.id === view.activeGoalId ? ' active' : '';
          return (
            `<button type="button" class="btn hub-goal${active}" data-hub-goal="${esc(g.id)}">` +
            `<strong>${esc(g.label)}</strong>` +
            `<span>${esc(g.blurb)}</span></button>`
          );
        })
        .join('');
      bodyHtml += `<div class="hub-goals">${goals}</div>`;
      if (view.activeGoalId) {
        bodyHtml += `<div class="hub-note">${esc(safeT('hudChrome.hub.guru.active', { id: view.activeGoalId }))}</div>`;
      }
    }

    if (view.kind === 'library' && view.chapters) {
      const opts = libraryFilterOptions(LIBRARY_CHAPTERS);
      const boardChips =
        `<button type="button" class="btn hub-chip${this.libraryBoard ? '' : ' active'}" data-hub-board="">All boards</button>` +
        opts.boards
          .map((b) => {
            const active = this.libraryBoard === b ? ' active' : '';
            return `<button type="button" class="btn hub-chip${active}" data-hub-board="${esc(b)}">${esc(b)}</button>`;
          })
          .join('');
      const subjectChips =
        `<button type="button" class="btn hub-chip${this.librarySubject ? '' : ' active'}" data-hub-subject="">All subjects</button>` +
        opts.subjects
          .map((s) => {
            const active = this.librarySubject === s ? ' active' : '';
            return `<button type="button" class="btn hub-chip${active}" data-hub-subject="${esc(s)}">${esc(s)}</button>`;
          })
          .join('');
      const list = view.chapters
        .map((c) => {
          const active = c.id === view.selectedChapterId ? ' active' : '';
          return (
            `<button type="button" class="btn hub-chapter${active}" data-hub-chapter="${esc(c.id)}">` +
            `${esc(c.board)} ${esc(c.classLevel)} · ${esc(c.title)}</button>`
          );
        })
        .join('');
      const selected =
        view.chapters.find((c) => c.id === view.selectedChapterId) ?? view.chapters[0];
      bodyHtml +=
        `<div class="hub-filters">${boardChips}</div>` +
        `<div class="hub-filters">${subjectChips}</div>` +
        `<div class="hub-chapters">${list || `<div class="hub-note">No chapters match.</div>`}</div>` +
        (selected
          ? `<div class="hub-excerpt"><h4>${esc(selected.title)}</h4><p>${esc(selected.excerpt)}</p></div>`
          : '');
    }

    if ((view.kind === 'study_hall' || view.kind === 'assessment') && view.readiness) {
      const rows = view.readiness
        .map(
          (r) =>
            `<div class="hub-ready-row"><span>${esc(r.subject)}</span>` +
            `<span>L${r.level} · T${r.tier}</span>` +
            `<div class="hub-ready-bar"><div style="width:${Math.round(r.progress * 100)}%"></div></div></div>`,
        )
        .join('');
      bodyHtml += `<div class="hub-ready">${rows}</div>`;
      if (view.kind === 'study_hall') {
        bodyHtml +=
          `<div class="hub-actions"><button type="button" class="btn" data-hub-study">${esc(
            safeT('hudChrome.hub.study_hall.start'),
          )}</button>` +
          `<button type="button" class="btn" data-hub-review">${esc(
            safeT('hudChrome.hub.study_hall.review', { n: String(view.dueCount ?? 0) }),
          )}</button></div>`;
      } else {
        bodyHtml += `<div class="hub-note">${esc(safeT('hudChrome.hub.assessment.soon'))}</div>`;
      }
    }

    if (view.kind === 'theatre' && view.playlist) {
      const pl = view.playlist
        .map((p) => `<li><strong>${esc(p.title)}</strong> · ${esc(p.note)}</li>`)
        .join('');
      bodyHtml += `<ul class="hub-playlist">${pl}</ul>`;
    }

    if (view.kind === 'chai') {
      bodyHtml += `<div class="hub-note">${esc(safeT('hudChrome.hub.chai.rest'))}</div>`;
    }

    this.root.innerHTML =
      `<div class="panel-title"><span>${title}</span>` +
      `<button type="button" class="x-btn" data-hub-close aria-label="${esc(safeT('hudChrome.hub.close'))}">×</button></div>` +
      bodyHtml;
  }
}
