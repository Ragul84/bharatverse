/**
 * TheatreScene — the interior of the Learning Theatre (a real in-game room, not a
 * flat overlay). A branded screen + curtains up front, raked rows of red cinema
 * seats split by a carpet aisle, seated avatars with nameplates, a tickets booth
 * and EXIT. Click a free seat to sit; during show hours a "Watch Fullscreen"
 * button opens the educational video. Styled in our 2D top-down look (the kintara
 * reference is isometric voxel art, which needs an art pipeline we don't have).
 */

import { Scene, GameObjects } from 'phaser';
import { compositeLpc, randomConfig, lpcReady, type LpcConfig } from '../lpc_composite';
import { isShowtime, nextShowLabel, openVideoOverlay } from '../theatre';

interface Seat { x: number; y: number; occupied: boolean; }

const SITTER_FRAME = 8 * 13; // LPC "up" idle → audience faces the screen (their backs to us)
const NPC_NAMES = ['Anika', 'Vivaan', 'Ishaan', 'Diya', 'Aditya', 'Sneha', 'Manav', 'Tara', 'Arjun', 'Priya', 'Kabir', 'Meera', 'Rohan', 'Isha'];

export class TheatreScene extends Scene {
  private playerSeat!: Seat;
  private playerSitter!: GameObjects.Container;
  private u = 1; // size unit (device-pixel scale so elements aren't tiny)

  constructor() { super({ key: 'TheatreScene', active: false }); }

  create(): void {
    const W = this.scale.width, H = this.scale.height;
    const u = this.u = (this.registry.get('dpr') as number) || 1;
    const useLpc = lpcReady(this);

    // Room + floor + carpet aisle
    this.add.rectangle(W / 2, H / 2, W, H, 0x140a16).setDepth(0);
    this.add.rectangle(W / 2, H * 0.64, W * 0.92, H * 0.72, 0x1d1122).setDepth(0);
    this.add.rectangle(W / 2, H * 0.62, 96 * u, H * 0.86, 0x7a1f2b).setDepth(1); // aisle carpet

    // ---- Screen + curtains ----
    const scrW = Math.min(W * 0.44, 640 * u), scrH = scrW * 9 / 16;
    const scrX = W / 2, scrY = H * 0.075 + scrH / 2;
    this.add.rectangle(scrX - scrW / 2 - 24 * u, scrY, 42 * u, scrH * 1.3, 0x5b0f16).setDepth(2);
    this.add.rectangle(scrX + scrW / 2 + 24 * u, scrY, 42 * u, scrH * 1.3, 0x5b0f16).setDepth(2);
    this.add.rectangle(scrX, scrY, scrW + 26 * u, scrH + 26 * u, 0x6d28d9, 0.22).setDepth(2);
    const open = isShowtime();
    this.add.rectangle(scrX, scrY, scrW, scrH, open ? 0x1e3a5f : 0x0b0b12)
      .setStrokeStyle(5 * u, 0x0a0a0a).setDepth(3);
    if (open) {
      this.add.text(scrX, scrY - 14 * u, 'MindGains', {
        fontSize: `${Math.round(30 * u)}px`, fontFamily: '"Noto Sans", sans-serif', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(4);
      this.add.text(scrX, scrY + 22 * u, 'Watch. Learn. Grow.', {
        fontSize: `${Math.round(15 * u)}px`, fontFamily: '"Noto Sans", sans-serif', color: '#cbd5e1',
      }).setOrigin(0.5).setDepth(4);
      const by = scrY + scrH / 2 + 34 * u;
      this.add.rectangle(scrX, by, 210 * u, 42 * u, 0x15803d).setStrokeStyle(2 * u, 0x86efac).setDepth(4)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.watch());
      this.add.text(scrX, by, '▶  Watch Fullscreen', {
        fontSize: `${Math.round(15 * u)}px`, fontFamily: '"Noto Sans", sans-serif', color: '#fff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(5);
    } else {
      this.add.text(scrX, scrY, `Closed\nNext show at ${nextShowLabel()}`, {
        fontSize: `${Math.round(16 * u)}px`, fontFamily: '"Noto Sans", sans-serif', color: '#94a3b8', align: 'center',
      }).setOrigin(0.5).setDepth(4);
    }

    // ---- Seats (raked rows split by the aisle) ----
    const rows = 5, cols = 10, aisle = new Set([4, 5]);
    const seatSize = 28 * u, gapX = 8 * u, gapY = 20 * u;
    const gridW = cols * (seatSize + gapX);
    const startX = W / 2 - gridW / 2 + seatSize / 2;
    const startY = scrY + scrH / 2 + 96 * u;
    const seats: Seat[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (aisle.has(c)) continue;
        const x = startX + c * (seatSize + gapX);
        const y = startY + r * (seatSize + gapY);
        this.add.rectangle(x, y, seatSize, seatSize * 0.5, 0x7a2530).setDepth(3);              // seat base
        this.add.rectangle(x, y - seatSize * 0.4, seatSize, seatSize * 0.6, 0x5b1a24).setStrokeStyle(1, 0x00000055).setDepth(3); // back
        seats.push({ x, y: y - seatSize * 0.3, occupied: false });
      }
    }

    // Populate ~40% with NPCs
    let taken = 0;
    seats.forEach((seat, i) => {
      if (((i * 37) % 100) < 40) {
        seat.occupied = true;
        this.placeSitter(seat, NPC_NAMES[taken % NPC_NAMES.length], randomConfig(1000 + i), useLpc, false);
        taken++;
      }
    });

    // Player sits in a central free seat by default
    const free = seats.filter((s) => !s.occupied);
    this.playerSeat = free[Math.floor(free.length / 2)] ?? seats[0];
    this.playerSeat.occupied = true;
    const cfg: Partial<LpcConfig> = {
      ...(this.registry.get('customization') as Partial<LpcConfig> | undefined ?? {}),
      hat: (this.registry.get('equippedHat') as number | undefined) ?? 0,
    };
    this.playerSitter = this.placeSitter(this.playerSeat, 'You', cfg, useLpc, true);

    // Click a free seat to move there
    seats.forEach((seat) => {
      if (seat.occupied) return;
      this.add.rectangle(seat.x, seat.y, seatSize, seatSize * 1.6, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true }).setDepth(6)
        .on('pointerdown', () => this.sitAt(seat));
    });

    // ---- Header ----
    this.add.rectangle(W / 2, 24 * u, W, 46 * u, 0x000000, 0.55).setDepth(20);
    this.add.text(16 * u, 24 * u, 'Cinema District', {
      fontSize: `${Math.round(15 * u)}px`, fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(21);
    this.add.text(W / 2, 24 * u, `Inside Theatre    👥 ${taken + 1}`, {
      fontSize: `${Math.round(15 * u)}px`, fontFamily: '"Noto Sans", sans-serif', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);
    this.add.rectangle(W - 66 * u, 24 * u, 96 * u, 30 * u, 0x3b2a1e).setStrokeStyle(2 * u, 0xf59e0b).setDepth(21)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.leave());
    this.add.text(W - 66 * u, 24 * u, '✕ Leave', {
      fontSize: `${Math.round(13 * u)}px`, fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(22);

    // ---- Tickets booth + EXIT ----
    this.add.rectangle(96 * u, H - 58 * u, 156 * u, 74 * u, 0x3a2a1a).setStrokeStyle(2 * u, 0x6b4a24).setDepth(3);
    this.add.text(96 * u, H - 84 * u, '🎟  TICKETS', {
      fontSize: `${Math.round(13 * u)}px`, fontFamily: '"Noto Sans", sans-serif', color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(58 * u, 62 * u, 'EXIT', {
      fontSize: `${Math.round(12 * u)}px`, fontFamily: '"Noto Sans", sans-serif', color: '#dcfce7', fontStyle: 'bold',
      backgroundColor: '#14532d', padding: { x: 6, y: 2 },
    }).setOrigin(0.5).setDepth(21);

    // ESC leaves
    this.input.keyboard?.on('keydown-ESC', () => this.leave());
  }

  private placeSitter(seat: Seat, name: string, cfg: Partial<LpcConfig>, useLpc: boolean, isYou = false): GameObjects.Container {
    const cont = this.add.container(seat.x, seat.y).setDepth(4);
    if (useLpc) {
      const key = compositeLpc(this, cfg);
      cont.add(this.add.sprite(0, 0, key, SITTER_FRAME).setOrigin(0.5, 0.9).setScale(this.u * 0.7));
    } else {
      cont.add(this.add.circle(0, -6 * this.u, 8 * this.u, isYou ? 0xfde047 : 0x93c5fd));
    }
    cont.add(this.add.text(0, -30 * this.u, name, {
      fontSize: `${Math.round(11 * this.u)}px`, fontFamily: '"Noto Sans", sans-serif',
      color: isYou ? '#fde047' : '#ffffff', stroke: '#000000', strokeThickness: 3,
      fontStyle: isYou ? 'bold' : 'normal',
    }).setOrigin(0.5, 1));
    return cont;
  }

  private sitAt(seat: Seat): void {
    if (seat.occupied || !this.playerSitter) return;
    this.playerSeat.occupied = false;
    seat.occupied = true;
    this.playerSeat = seat;
    this.tweens.add({ targets: this.playerSitter, x: seat.x, y: seat.y, duration: 240, ease: 'Quad.out' });
  }

  private watch(): void {
    this.input.enabled = false;
    openVideoOverlay(() => { this.input.enabled = true; });
  }

  private leave(): void {
    this.scene.stop('TheatreScene');
    this.scene.wake('HUDScene');
    this.scene.resume('WorldScene');
  }
}
