/**
 * Learning Theatre content + the fullscreen video overlay. The theatre *room*
 * (screen, curtains, seats, avatars, tickets booth) is a real in-game scene —
 * see scenes/TheatreScene.ts. This module owns show hours, the curated playlist,
 * and the YouTube fullscreen overlay a seated player opens to actually watch.
 *
 * A DOM <iframe> can't live in the Phaser WebGL canvas, so the video is a DOM
 * overlay. MAINTAINER: curate real English-educational YouTube IDs below.
 */

export const SHOW_START_HOUR = 6;  // 6 AM
export const SHOW_END_HOUR = 21;   // 9 PM

export const THEATRE_VIDEOS: string[] = [
  'BWjmzABYn2M', 'ZM8ECpBuQYE', 'yWO-cvGETRQ', // placeholders — curate real IDs
];

export function isShowtime(d = new Date()): boolean {
  const h = d.getHours();
  return h >= SHOW_START_HOUR && h < SHOW_END_HOUR;
}
export function nextShowLabel(): string { return `${SHOW_START_HOUR}:00 AM`; }
export function showHoursLabel(): string {
  return `${SHOW_START_HOUR}:00 AM – ${SHOW_END_HOUR - 12}:00 PM`;
}

function embedUrl(): string {
  const ids = THEATRE_VIDEOS.filter(Boolean);
  const params = new URLSearchParams({
    autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1',
    loop: '1', playlist: ids.join(','),
  });
  return `https://www.youtube-nocookie.com/embed/${ids[0] ?? ''}?${params.toString()}`;
}

let videoOverlay: HTMLDivElement | null = null;

/** Big fullscreen video the seated player opens from the theatre screen. */
export function openVideoOverlay(onClose?: () => void): void {
  if (videoOverlay) return;
  videoOverlay = document.createElement('div');
  videoOverlay.id = 'bv-theatre-video';
  videoOverlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:10000', 'background:#000',
    'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
    'font-family:"Noto Sans", system-ui, sans-serif',
  ].join(';');

  const close = () => { closeVideoOverlay(); onClose?.(); };

  const frame = document.createElement('div');
  frame.style.cssText = 'width:min(92vw,1280px);aspect-ratio:16/9;box-shadow:0 0 80px #6d28d955;border:2px solid #f59e0b55;border-radius:8px;overflow:hidden;background:#000';
  const iframe = document.createElement('iframe');
  iframe.src = embedUrl();
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.style.cssText = 'width:100%;height:100%;border:0;display:block';
  frame.appendChild(iframe);
  videoOverlay.appendChild(frame);

  const row = document.createElement('div');
  row.style.cssText = 'margin-top:16px;display:flex;gap:12px';
  const fs = document.createElement('button');
  fs.textContent = '⛶ Fullscreen';
  fs.style.cssText = 'background:#15803d;color:#fff;border:2px solid #86efac;border-radius:10px;padding:10px 22px;font-weight:800;font-size:15px;cursor:pointer';
  fs.onclick = () => {
    const el = frame as HTMLElement & { webkitRequestFullscreen?: () => void };
    (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
  };
  const back = document.createElement('button');
  back.textContent = '↩ Back to seat';
  back.style.cssText = 'background:#3b2a1e;color:#fde68a;border:2px solid #f59e0b;border-radius:10px;padding:10px 22px;font-weight:800;font-size:15px;cursor:pointer';
  back.onclick = close;
  row.append(fs, back);
  videoOverlay.appendChild(row);

  document.body.appendChild(videoOverlay);
}

export function closeVideoOverlay(): void {
  if (!videoOverlay) return;
  videoOverlay.remove(); // removing the iframe stops playback
  videoOverlay = null;
}
