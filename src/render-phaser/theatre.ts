/**
 * Learning Theatre — a real cinema: a big screen up front and raked rows of seats
 * you pick and sit in. During show hours the screen auto-plays English-only
 * educational YouTube videos; the screen is angled (you can't read it comfortably
 * from your seat) so a Fullscreen button takes over for real viewing.
 *
 * A DOM overlay (a YouTube <iframe> can't live inside the Phaser WebGL canvas),
 * toggled from the world building. Content is curated — only add English-language
 * educational video IDs to THEATRE_VIDEOS; they loop back-to-back.
 */

export const SHOW_START_HOUR = 6;  // 6 AM
export const SHOW_END_HOUR = 21;   // 9 PM

/** MAINTAINER: replace with vetted English educational YouTube video IDs. */
export const THEATRE_VIDEOS: string[] = [
  'BWjmzABYn2M', 'ZM8ECpBuQYE', 'yWO-cvGETRQ', // placeholders — curate real IDs
];

const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E'];
const SEAT_COLS = 8;

export function isShowtime(d = new Date()): boolean {
  const h = d.getHours();
  return h >= SHOW_START_HOUR && h < SHOW_END_HOUR;
}
export function nextShowLabel(): string { return `${SHOW_START_HOUR}:00 AM`; }

let overlay: HTMLDivElement | null = null;
let selectedSeat = '';

function embedUrl(): string {
  const ids = THEATRE_VIDEOS.filter(Boolean);
  const params = new URLSearchParams({
    autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1',
    loop: '1', playlist: ids.join(','),
  });
  return `https://www.youtube-nocookie.com/embed/${ids[0] ?? ''}?${params.toString()}`;
}

// Deterministic "already taken" seats so the room feels populated in single-player.
function seatTaken(row: number, col: number): boolean {
  const h = (row * 73856093) ^ (col * 19349663);
  return (Math.abs(h) % 100) < 42 && !(row === SEAT_ROWS.length - 1 && col === 0);
}

export function openTheatre(onClose?: () => void): void {
  if (overlay) return;
  selectedSeat = '';

  overlay = document.createElement('div');
  overlay.id = 'bv-theatre';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:10000', 'overflow:hidden',
    'background:radial-gradient(ellipse at 50% 22%, #241a33 0%, #0a0812 60%, #05040a 100%)',
    'display:flex', 'flex-direction:column', 'align-items:center',
    'font-family:"Noto Sans", system-ui, sans-serif', 'color:#f8fafc',
  ].join(';');

  const close = () => { closeTheatre(); onClose?.(); };

  // Title bar
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;z-index:3';
  bar.innerHTML = `<div style="font-size:20px;font-weight:800;color:#fde68a;letter-spacing:.5px">🎬 Learning Theatre</div>`;
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Leave';
  closeBtn.style.cssText = 'background:#3b2a1e;color:#fde68a;border:2px solid #f59e0b;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;font-size:14px';
  closeBtn.onclick = close;
  bar.appendChild(closeBtn);
  overlay.appendChild(bar);

  if (!isShowtime()) {
    const card = document.createElement('div');
    card.style.cssText = 'margin:auto;text-align:center;max-width:460px;padding:28px;background:#140d04cc;border:2px solid #f59e0b;border-radius:14px';
    card.innerHTML = `<div style="font-size:44px;margin-bottom:8px">🎦</div>
      <div style="font-size:20px;font-weight:800;color:#fde68a;margin-bottom:6px">The theatre is closed</div>
      <div style="opacity:.85;line-height:1.5">Shows run daily <b>${SHOW_START_HOUR}:00 AM – ${SHOW_END_HOUR - 12}:00 PM</b>.<br>Come back at <b>${nextShowLabel()}</b> for today's lessons.</div>`;
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    return;
  }

  // ---- Screen up front (angled so you can't watch comfortably from your seat) ----
  const stage = document.createElement('div');
  stage.style.cssText = 'perspective:1400px;margin-top:52px;display:flex;flex-direction:column;align-items:center';
  const screen = document.createElement('div');
  screen.id = 'bv-screen';
  screen.style.cssText = [
    'width:min(56vw,760px)', 'aspect-ratio:16/9', 'border:8px solid #0a0a0a', 'border-radius:6px',
    'box-shadow:0 26px 70px #000c, 0 0 60px #6d28d955, 0 0 0 3px #f59e0b55',
    'overflow:hidden', 'background:#000', 'transform:rotateX(11deg) scale(.96)', 'transform-origin:center top',
  ].join(';');
  const iframe = document.createElement('iframe');
  iframe.src = embedUrl();
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.style.cssText = 'width:100%;height:100%;border:0;display:block';
  screen.appendChild(iframe);
  stage.appendChild(screen);
  // floor glow under the screen
  const glow = document.createElement('div');
  glow.style.cssText = 'width:min(60vw,820px);height:26px;margin-top:-6px;background:radial-gradient(ellipse at 50% 0%, #f59e0b33, transparent 70%)';
  stage.appendChild(glow);
  overlay.appendChild(stage);

  // ---- Fullscreen CTA ----
  const cta = document.createElement('div');
  cta.style.cssText = 'margin-top:8px;text-align:center';
  const fs = document.createElement('button');
  fs.textContent = '⛶  Fullscreen the lesson';
  fs.style.cssText = 'background:#15803d;color:#fff;border:2px solid #86efac;border-radius:10px;padding:10px 22px;font-weight:800;font-size:15px;cursor:pointer';
  fs.onclick = () => {
    screen.style.transform = 'none';
    const el = screen as HTMLElement & { webkitRequestFullscreen?: () => void };
    (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
  };
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && overlay) screen.style.transform = 'rotateX(11deg) scale(.96)';
  });
  cta.appendChild(fs);
  overlay.appendChild(cta);

  // ---- Seating: raked rows you pick a seat from ----
  const status = document.createElement('div');
  status.id = 'bv-seat-status';
  status.textContent = 'Pick a seat 🪑';
  status.style.cssText = 'margin-top:16px;font-size:14px;color:#fde68a;font-weight:700;height:18px';
  overlay.appendChild(status);

  const house = document.createElement('div');
  house.style.cssText = 'perspective:700px;margin-top:6px;display:flex;flex-direction:column;align-items:center;gap:9px;padding-bottom:24px';
  SEAT_ROWS.forEach((rowLabel, r) => {
    const row = document.createElement('div');
    // rows nearer the viewer (higher r) are larger — cheap depth.
    const scale = 0.82 + r * 0.06;
    row.style.cssText = `display:flex;gap:9px;transform:scale(${scale})`;
    for (let c = 0; c < SEAT_COLS; c++) {
      const seat = document.createElement('button');
      const id = `${rowLabel}${c + 1}`;
      const taken = seatTaken(r, c);
      seat.dataset.seat = id;
      seat.title = taken ? `Seat ${id} (taken)` : `Sit in ${id}`;
      seat.style.cssText = [
        'width:26px', 'height:22px', 'border-radius:6px 6px 3px 3px', 'cursor:' + (taken ? 'default' : 'pointer'),
        'border:2px solid ' + (taken ? '#3f3f46' : '#f59e0b'),
        'background:' + (taken ? '#27272a' : '#5b3a1e'),
        'transition:transform .08s',
      ].join(';');
      if (!taken) {
        seat.onmouseenter = () => { seat.style.transform = 'translateY(-2px)'; };
        seat.onmouseleave = () => { if (selectedSeat !== id) seat.style.transform = 'none'; };
        seat.onclick = () => selectSeat(id, rowLabel, c + 1);
      }
      row.appendChild(seat);
    }
    house.appendChild(row);
  });
  overlay.appendChild(house);

  document.body.appendChild(overlay);
}

function selectSeat(id: string, rowLabel: string, col: number): void {
  if (!overlay) return;
  selectedSeat = id;
  overlay.querySelectorAll<HTMLButtonElement>('button[data-seat]').forEach((b) => {
    const mine = b.dataset.seat === id;
    b.style.background = mine ? '#f59e0b' : (b.style.borderColor === 'rgb(63, 63, 70)' ? '#27272a' : '#5b3a1e');
    b.style.transform = mine ? 'translateY(-3px) scale(1.15)' : 'none';
    b.style.boxShadow = mine ? '0 0 10px #fde68a' : 'none';
  });
  const status = document.getElementById('bv-seat-status');
  if (status) status.textContent = `Seated — Row ${rowLabel}, Seat ${col} 🍿  Enjoy the lesson!`;
}

export function closeTheatre(): void {
  if (!overlay) return;
  overlay.remove(); // removing the iframe stops playback
  overlay = null;
}
