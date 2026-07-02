/**
 * Learning Theatre — a cinema building you enter to watch English-only
 * educational videos on a big screen (auto-playing during show hours). The
 * in-world screen sits at an angle (you can't read it fully); a Fullscreen
 * button takes over for real viewing. A DOM overlay (YouTube <iframe> can't live
 * inside the Phaser WebGL canvas), toggled from the world building.
 *
 * Content is curated: only add English-language educational YouTube video IDs to
 * THEATRE_VIDEOS below. They play back-to-back as a looping playlist.
 */

// Show hours (local time), inclusive start, exclusive end: 6:00 AM – 9:00 PM.
export const SHOW_START_HOUR = 6;
export const SHOW_END_HOUR = 21;

/**
 * Curated English educational YouTube video IDs (the bit after `watch?v=`).
 * MAINTAINER: replace/extend with a vetted playlist. They loop back-to-back.
 */
export const THEATRE_VIDEOS: string[] = [
  'BWjmzABYn2M', // (placeholder) educational science short
  'ZM8ECpBuQYE', // (placeholder)
  'yWO-cvGETRQ', // (placeholder)
];

export function isShowtime(d = new Date()): boolean {
  const h = d.getHours();
  return h >= SHOW_START_HOUR && h < SHOW_END_HOUR;
}

/** Human "next show" label for the closed state. */
export function nextShowLabel(): string {
  return `${SHOW_START_HOUR}:00 AM`;
}

let overlay: HTMLDivElement | null = null;

/** Build the YouTube embed URL: first video + the rest as a looping playlist. */
function embedUrl(): string {
  const ids = THEATRE_VIDEOS.filter(Boolean);
  const first = ids[0] ?? '';
  const list = ids.join(',');
  const params = new URLSearchParams({
    autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1',
    loop: '1', playlist: list,
  });
  return `https://www.youtube-nocookie.com/embed/${first}?${params.toString()}`;
}

/** Open the theatre overlay. `onClose` lets the caller resume game input. */
export function openTheatre(onClose?: () => void): void {
  if (overlay) return;
  const open = isShowtime();

  overlay = document.createElement('div');
  overlay.id = 'bv-theatre';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:10000',
    'background:radial-gradient(ellipse at 50% 35%, #1b1327 0%, #05040a 80%)',
    'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
    'font-family:"Noto Sans", system-ui, sans-serif', 'color:#f8fafc',
  ].join(';');

  const close = () => { closeTheatre(); onClose?.(); };

  // Title bar
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:14px 20px';
  bar.innerHTML = `<div style="font-size:20px;font-weight:800;color:#fde68a;letter-spacing:.5px">🎬 Learning Theatre</div>`;
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕ Leave';
  closeBtn.style.cssText = 'background:#3b2a1e;color:#fde68a;border:2px solid #f59e0b;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;font-size:14px';
  closeBtn.onclick = close;
  bar.appendChild(closeBtn);
  overlay.appendChild(bar);

  if (!open) {
    const card = document.createElement('div');
    card.style.cssText = 'text-align:center;max-width:460px;padding:28px;background:#140d04cc;border:2px solid #f59e0b;border-radius:14px';
    card.innerHTML = `<div style="font-size:44px;margin-bottom:8px">🎦</div>
      <div style="font-size:20px;font-weight:800;color:#fde68a;margin-bottom:6px">The theatre is closed</div>
      <div style="opacity:.85;line-height:1.5">Shows run daily <b>${SHOW_START_HOUR}:00 AM – ${SHOW_END_HOUR - 12}:00 PM</b>.<br>Come back at <b>${nextShowLabel()}</b> for today's lessons.</div>`;
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    return;
  }

  // The angled "screen" — a perspective tilt so it reads as a screen across the
  // room that you can't watch comfortably until you go fullscreen.
  const stage = document.createElement('div');
  stage.style.cssText = 'perspective:1100px;display:flex;align-items:center;justify-content:center;margin-top:12px';
  const screen = document.createElement('div');
  screen.style.cssText = [
    'width:min(64vw,900px)', 'aspect-ratio:16/9', 'border:8px solid #0a0a0a',
    'border-radius:6px', 'box-shadow:0 30px 80px #000a, 0 0 0 3px #f59e0b55',
    'overflow:hidden', 'background:#000',
    'transform:rotateY(-19deg) rotateX(6deg) scale(.92)', 'transform-origin:center',
  ].join(';');
  const iframe = document.createElement('iframe');
  iframe.src = embedUrl();
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.style.cssText = 'width:100%;height:100%;border:0;display:block';
  screen.appendChild(iframe);
  stage.appendChild(screen);
  overlay.appendChild(stage);

  // Hint + Fullscreen CTA
  const cta = document.createElement('div');
  cta.style.cssText = 'margin-top:26px;text-align:center';
  cta.innerHTML = `<div style="opacity:.8;margin-bottom:10px">Hard to watch from your seat — go fullscreen for the lesson.</div>`;
  const fs = document.createElement('button');
  fs.textContent = '⛶  Fullscreen';
  fs.style.cssText = 'background:#15803d;color:#fff;border:2px solid #86efac;border-radius:10px;padding:12px 26px;font-weight:800;font-size:16px;cursor:pointer';
  fs.onclick = () => {
    const el = screen as HTMLElement & { webkitRequestFullscreen?: () => void };
    // reset the tilt so fullscreen shows the video flat
    screen.style.transform = 'none';
    (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
  };
  // restore the angled seat-view when leaving fullscreen
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && overlay) screen.style.transform = 'rotateY(-19deg) rotateX(6deg) scale(.92)';
  });
  cta.appendChild(fs);
  overlay.appendChild(cta);

  overlay.appendChild(bar); // keep title bar on top
  document.body.appendChild(overlay);
}

export function closeTheatre(): void {
  if (!overlay) return;
  overlay.remove(); // removing the iframe stops playback
  overlay = null;
}
