import { describe, it, expect } from 'vitest';
import { decoTexture, decoTint } from '../src/render-phaser/decoration_style';

describe('decoTexture', () => {
  it('maps each decoration kind to its texture', () => {
    expect(decoTexture('tree')).toBe('bv-tree');
    expect(decoTexture('tree2')).toBe('bv-tree2');
    expect(decoTexture('rock')).toBe('bv-rock');
  });
});

describe('decoTint', () => {
  it('never tints rocks', () => {
    expect(decoTint('rock', 'vale')).toBe(0xffffff);
    expect(decoTint('rock', 'marsh')).toBe(0xffffff);
    expect(decoTint('rock', 'peaks')).toBe(0xffffff);
  });

  it('tints foliage per biome (vale untinted, marsh/peaks washed)', () => {
    expect(decoTint('tree', 'vale')).toBe(0xffffff);
    expect(decoTint('tree', 'marsh')).toBe(0xc8d0a0);
    expect(decoTint('tree2', 'peaks')).toBe(0xa9c0a8);
  });
});
