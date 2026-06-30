// MIGA — Mindgains Intelligence Guide Agent
// Cyan wolf mascot — appears as DOM overlay over Three.js canvas.
// Triggers on: wrong answers, level-ups, quest completions.

import { BHARATVERSE_THEME } from './theme';

export type MIGAEventType = 'wrong' | 'levelup' | 'quest' | 'info' | 'combo';

export class MIGAGuide {
  private panel: HTMLDivElement;
  private dismissTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.panel = document.createElement('div');
    this.panel.id = 'miga-panel';
    this.panel.style.cssText = `
      position: fixed; bottom: 110px; right: 24px; z-index: 8888;
      width: 320px; display: none;
      font-family: ${BHARATVERSE_THEME.fontUI};
      pointer-events: none;
    `;
    document.body.appendChild(this.panel);
    this._injectStyles();
  }

  private _injectStyles() {
    if (document.getElementById('bv-miga-styles')) return;
    const style = document.createElement('style');
    style.id = 'bv-miga-styles';
    style.textContent = `
      @keyframes miga-slide-in {
        from { opacity: 0; transform: translateX(30px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes miga-slide-out {
        from { opacity: 1; transform: translateX(0); }
        to   { opacity: 0; transform: translateX(30px); }
      }
      #miga-panel { animation: miga-slide-in 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
      #miga-panel.hiding { animation: miga-slide-out 0.25s ease forwards; }
    `;
    document.head.appendChild(style);
  }

  async showWrongAnswer(questionText: string, chosen: string, correct: string, explanation: string) {
    // Show a quick fallback immediately, then update if API responds
    const fallback = `Almost there, scholar! The answer relates to: **${explanation}**. Keep fighting!`;
    this.show(fallback, 'wrong', 9000);

    try {
      const res = await fetch('/api/miga/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText, chosen, correct, explanation }),
      });
      const data = await res.json() as { message: string };
      if (data.message) {
        // Update the message content in-place
        const msgEl = document.getElementById('miga-msg');
        if (msgEl) msgEl.textContent = data.message;
      }
    } catch {
      // Fallback already shown — no action needed
    }
  }

  showLevelUp(newLevel: number, playerClass: string) {
    const msgs: Record<string, string> = {
      brahmarishi: `Level ${newLevel}! Your wisdom radiates like a thousand shlokas! New mantra awaits, scholar.`,
      kshatriya:   `Level ${newLevel}! Your battle cry echoes across Gangapur Nagari! Dharma grows stronger!`,
      vaishya:     `Level ${newLevel}! Every market in the land bows to your cunning. New trade routes open!`,
      shilpi:      `Level ${newLevel}! Your craft shapes Bharat itself! New blueprints unlocked!`,
      vaidya:      `Level ${newLevel}! Life's deepest secrets yield to your knowledge. Heal the world!`,
    };
    this.show(msgs[playerClass] ?? `Level ${newLevel}! You grow stronger in knowledge and battle!`, 'levelup', 6000);
  }

  showQuestComplete(questName: string, xpGained: number) {
    this.show(
      `Quest complete: "${questName}"! +${xpGained} XP earned. Guru Shukracharya is proud of you, warrior!`,
      'quest', 6000,
    );
  }

  showComboBreak(finalCombo: number) {
    if (finalCombo >= 5) {
      this.show(
        `Combo broken at ×${finalCombo}! Study the concept — next fight, build it back stronger.`,
        'info', 4000,
      );
    }
  }

  showDungeonEntry(dungeonName: string) {
    this.show(
      `Entering ${dungeonName}! Knowledge questions will come fast here — every boss demands an answer. Stay sharp!`,
      'info', 5000,
    );
  }

  show(message: string, type: MIGAEventType, duration = 6000) {
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
      this.dismissTimeout = null;
    }

    const colors: Record<MIGAEventType, string> = {
      wrong:   BHARATVERSE_THEME.crimson,
      levelup: BHARATVERSE_THEME.gold,
      quest:   BHARATVERSE_THEME.emerald,
      info:    BHARATVERSE_THEME.chakraBlue,
      combo:   BHARATVERSE_THEME.saffron,
    };

    const icons: Record<MIGAEventType, string> = {
      wrong:   '❌',
      levelup: '⭐',
      quest:   '📜',
      info:    '💡',
      combo:   '🔥',
    };

    const col = colors[type];
    const icon = icons[type];

    this.panel.innerHTML = `
      <div style="background:${BHARATVERSE_THEME.surface};
        border:1px solid ${col}33;border-left:3px solid ${col};
        border-radius:12px;padding:14px 16px;
        display:flex;gap:12px;align-items:flex-start;
        box-shadow:${BHARATVERSE_THEME.shadow};pointer-events:all;">

        <!-- MIGA wolf avatar -->
        <div style="width:42px;height:42px;border-radius:10px;flex-shrink:0;
          background:${BHARATVERSE_THEME.gradientMIGA};
          display:flex;align-items:center;justify-content:center;
          font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">
          🐺
        </div>

        <div style="flex:1;min-width:0;">
          <div style="font-size:10px;font-family:${BHARATVERSE_THEME.fontMono};letter-spacing:2px;
            color:${BHARATVERSE_THEME.chakraBlue};text-transform:uppercase;margin-bottom:5px;font-weight:600;">
            MIGA ${icon}
          </div>
          <p id="miga-msg" style="color:${BHARATVERSE_THEME.ivory};font-size:13px;
            line-height:1.5;margin:0;">
            ${message}
          </p>
        </div>

        <button onclick="(()=>{const p=document.getElementById('miga-panel');if(p)p.style.display='none';})()"
          style="background:none;border:none;color:${BHARATVERSE_THEME.muted};cursor:pointer;
            font-size:18px;padding:0;flex-shrink:0;line-height:1;
            pointer-events:all;transition:color 0.15s;"
          onmouseover="this.style.color='${BHARATVERSE_THEME.ivory}'"
          onmouseout="this.style.color='${BHARATVERSE_THEME.muted}'">×</button>
      </div>
    `;

    this.panel.classList.remove('hiding');
    this.panel.style.display = 'block';

    this.dismissTimeout = setTimeout(() => {
      this.panel.classList.add('hiding');
      setTimeout(() => {
        this.panel.style.display = 'none';
        this.panel.classList.remove('hiding');
      }, 300);
    }, duration);
  }
}
