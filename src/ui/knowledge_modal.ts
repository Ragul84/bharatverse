import type { Question } from '../sim/content/questions';
import { BHARATVERSE_THEME, SUBJECT_COLORS, getComboStyle } from './theme';

export class KnowledgeModal {
  private overlay: HTMLDivElement;
  private comboCount = 0;
  private startTime = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private onAnswer: (answer: string, timeTakenMs: number) => void) {
    this.overlay = document.createElement('div');
    this.overlay.id = 'bv-knowledge-modal';
    this.overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      display: none; align-items: center; justify-content: center;
      background: rgba(8,12,24,0.92);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      font-family: ${BHARATVERSE_THEME.fontUI};
    `;
    document.body.appendChild(this.overlay);

    // Inject keyframe animation
    this._injectStyles();
  }

  private _injectStyles() {
    if (document.getElementById('bv-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'bv-modal-styles';
    style.textContent = `
      @keyframes bv-modal-in {
        from { opacity: 0; transform: scale(0.92) translateY(20px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes bv-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255,107,0,0); }
        50%       { box-shadow: 0 0 0 6px rgba(255,107,0,0.2); }
      }
      #bv-knowledge-modal .bv-opt-btn {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 16px; border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.03);
        color: ${BHARATVERSE_THEME.ivory};
        font-size: 14px; cursor: pointer;
        text-align: left; width: 100%;
        transition: border-color 0.15s, background 0.15s, transform 0.1s;
        font-family: inherit; line-height: 1.4;
      }
      #bv-knowledge-modal .bv-opt-btn:hover {
        border-color: ${BHARATVERSE_THEME.borderStrong};
        background: rgba(245,197,24,0.06);
        transform: translateX(2px);
      }
      #bv-knowledge-modal .bv-opt-key {
        display: inline-flex; align-items: center; justify-content: center;
        width: 26px; height: 26px; border-radius: 5px;
        background: rgba(255,255,255,0.08);
        color: ${BHARATVERSE_THEME.gold}; font-family: ${BHARATVERSE_THEME.fontMono};
        font-size: 11px; font-weight: 700; flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  show(q: Question, combo: number) {
    this.comboCount = combo;
    this.startTime = Date.now();
    let timeLeft = q.time_limit_seconds;

    const subjectColor = SUBJECT_COLORS[q.subject.toLowerCase()] ?? BHARATVERSE_THEME.gold;
    const comboStyle = getComboStyle(combo);

    const comboHtml = comboStyle
      ? `<div style="text-align:center;margin-bottom:14px;padding:6px 16px;
           background:rgba(255,107,0,0.1);border:1px solid rgba(255,107,0,0.3);
           border-radius:20px;color:${comboStyle.color};font-size:12px;font-weight:700;
           letter-spacing:2px;text-transform:uppercase;animation:bv-pulse 1.5s infinite;">
           ${comboStyle.label} ×${combo}
         </div>`
      : '';

    this.overlay.innerHTML = `
      <div style="background:${BHARATVERSE_THEME.surface};
        border:1px solid ${BHARATVERSE_THEME.border};
        border-top:2px solid ${subjectColor};
        border-radius:18px;padding:28px 32px;max-width:540px;width:92%;
        box-shadow:0 0 80px rgba(0,0,0,0.6),${BHARATVERSE_THEME.glowSaffron};
        animation:bv-modal-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards;">

        <!-- Header: subject + timer -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:6px;height:6px;border-radius:50%;background:${subjectColor};display:inline-block;"></span>
            <span style="font-family:${BHARATVERSE_THEME.fontMono};font-size:10px;letter-spacing:3px;
              color:${subjectColor};text-transform:uppercase;font-weight:600;">${q.subject.toUpperCase()}</span>
            <span style="font-family:${BHARATVERSE_THEME.fontMono};font-size:10px;color:${BHARATVERSE_THEME.muted};
              letter-spacing:1px;">· T${q.tier}/6</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="color:${BHARATVERSE_THEME.muted};font-size:11px;">TIME</span>
            <span id="bv-timer" style="font-family:${BHARATVERSE_THEME.fontMono};font-size:15px;
              color:${BHARATVERSE_THEME.emerald};font-weight:700;min-width:32px;text-align:right;">${timeLeft}s</span>
          </div>
        </div>

        <!-- Timer progress bar -->
        <div style="height:3px;background:${BHARATVERSE_THEME.faint};border-radius:2px;margin-bottom:20px;overflow:hidden;">
          <div id="bv-timer-bar" style="height:100%;width:100%;background:${BHARATVERSE_THEME.emerald};
            border-radius:2px;transition:width 0.95s linear,background 0.95s linear;"></div>
        </div>

        ${comboHtml}

        <!-- Question text -->
        <p style="color:${BHARATVERSE_THEME.ivory};font-size:16px;line-height:1.65;
          margin-bottom:22px;font-weight:500;">
          ${q.question}
        </p>

        <!-- Answer options -->
        <div style="display:grid;gap:10px;" id="bv-options">
          ${(['a','b','c','d'] as const).map(opt => `
            <button class="bv-opt-btn" data-opt="${opt}" id="bv-opt-${opt}">
              <span class="bv-opt-key">${opt.toUpperCase()}</span>
              <span>${q.options[opt]}</span>
            </button>
          `).join('')}
        </div>

        <!-- MIGA hint strip -->
        <div style="margin-top:18px;padding:10px 14px;border-radius:8px;
          background:rgba(79,195,247,0.05);border:1px solid rgba(79,195,247,0.12);
          display:flex;align-items:center;gap:10px;">
          <span style="font-size:18px;flex-shrink:0;">🐺</span>
          <span style="color:${BHARATVERSE_THEME.muted};font-size:11px;line-height:1.4;">
            <strong style="color:${BHARATVERSE_THEME.chakraBlue};">MIGA:</strong>
            Answer instantly for 3× damage! Wrong answer resets your combo streak.
          </span>
        </div>
      </div>
    `;

    // Attach click handlers
    const opts = this.overlay.querySelectorAll<HTMLButtonElement>('.bv-opt-btn');
    opts.forEach(btn => {
      btn.addEventListener('click', () => {
        const opt = btn.dataset.opt as string;
        if (this.timerInterval) clearInterval(this.timerInterval);
        const timeTaken = Date.now() - this.startTime;
        this._highlightAnswer(opt, q.correct);
        setTimeout(() => {
          this.hide();
          this.onAnswer(opt, timeTaken);
        }, 900);
      });
    });

    // Keyboard shortcuts: A/B/C/D keys
    const keyHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['a','b','c','d'].includes(key)) {
        document.removeEventListener('keydown', keyHandler);
        const btn = this.overlay.querySelector<HTMLButtonElement>(`[data-opt="${key}"]`);
        btn?.click();
      }
    };
    document.addEventListener('keydown', keyHandler);

    // Countdown timer
    this.timerInterval = setInterval(() => {
      timeLeft--;
      const timerEl = document.getElementById('bv-timer');
      const barEl    = document.getElementById('bv-timer-bar');
      if (timerEl && barEl) {
        timerEl.textContent = `${timeLeft}s`;
        const pct   = timeLeft / q.time_limit_seconds;
        const color = pct > 0.5
          ? BHARATVERSE_THEME.timerSafe
          : pct > 0.25
            ? BHARATVERSE_THEME.timerWarn
            : BHARATVERSE_THEME.timerCrit;
        timerEl.style.color = color;
        barEl.style.width      = `${pct * 100}%`;
        barEl.style.background = color;
      }
      if (timeLeft <= 0) {
        clearInterval(this.timerInterval!);
        document.removeEventListener('keydown', keyHandler);
        this._highlightAnswer('timeout', q.correct);
        setTimeout(() => {
          this.hide();
          this.onAnswer('timeout', q.time_limit_seconds * 1000);
        }, 900);
      }
    }, 1000);

    this.overlay.style.display = 'flex';
  }

  private _highlightAnswer(chosen: string, correct: string) {
    const btns = this.overlay.querySelectorAll<HTMLButtonElement>('[data-opt]');
    btns.forEach(btn => {
      const opt = btn.dataset.opt;
      btn.style.pointerEvents = 'none';
      if (opt === correct) {
        btn.style.borderColor = BHARATVERSE_THEME.correct;
        btn.style.background  = 'rgba(16,185,129,0.15)';
        btn.style.color       = BHARATVERSE_THEME.correct;
        const key = btn.querySelector<HTMLElement>('.bv-opt-key');
        if (key) { key.style.background = BHARATVERSE_THEME.correct; key.style.color = '#fff'; }
      } else if (opt === chosen && chosen !== correct) {
        btn.style.borderColor = BHARATVERSE_THEME.incorrect;
        btn.style.background  = 'rgba(239,68,68,0.1)';
        btn.style.color       = BHARATVERSE_THEME.incorrect;
      }
    });
  }

  hide() {
    this.overlay.style.display = 'none';
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
