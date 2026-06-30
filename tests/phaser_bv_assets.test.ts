import { describe, it, expect } from 'vitest';
import {
  characterArtKey, characterArtUrl, propArtKey, propArtUrl, isRealArtKey,
  resolveCharacterTexture, resolveDecoTexture, optionalAssets, PROP_NAMES,
} from '../src/render-phaser/bv_assets';
import { CHAR_PALETTES } from '../src/render-phaser/character_archetype';
import { characterTextureKey } from '../src/render-phaser/character_sprites';
import { decoTexture } from '../src/render-phaser/decoration_style';

describe('asset keys + urls', () => {
  it('builds character keys/urls by archetype', () => {
    expect(characterArtKey('cls-kshatriya')).toBe('bv-art-char-cls-kshatriya');
    expect(characterArtUrl('cls-kshatriya')).toBe('assets/characters/cls-kshatriya.png');
  });
  it('builds prop keys/urls by name', () => {
    expect(propArtKey('tree')).toBe('bv-art-prop-tree');
    expect(propArtUrl('rock')).toBe('assets/props/rock.png');
  });
  it('flags real-art keys vs procedural keys', () => {
    expect(isRealArtKey(characterArtKey('mob'))).toBe(true);
    expect(isRealArtKey(characterTextureKey('mob'))).toBe(false);
    expect(isRealArtKey(decoTexture('tree'))).toBe(false);
  });
});

describe('resolveCharacterTexture', () => {
  it('prefers the real texture when it is loaded', () => {
    const has = (k: string) => k === characterArtKey('cls-mage');
    expect(resolveCharacterTexture(has, 'cls-mage')).toBe('bv-art-char-cls-mage');
  });
  it('falls back to the procedural texture when the real one is absent', () => {
    expect(resolveCharacterTexture(() => false, 'cls-mage')).toBe(characterTextureKey('cls-mage'));
  });
});

describe('resolveDecoTexture', () => {
  it('prefers real prop art, else procedural', () => {
    const hasTree = (k: string) => k === propArtKey('tree');
    expect(resolveDecoTexture(hasTree, 'tree')).toBe('bv-art-prop-tree');
    expect(resolveDecoTexture(() => false, 'rock')).toBe(decoTexture('rock'));
    expect(resolveDecoTexture(() => false, 'tree2')).toBe(decoTexture('tree2'));
  });
});

describe('optionalAssets', () => {
  it('lists one entry per character archetype plus every prop', () => {
    const assets = optionalAssets();
    expect(assets).toHaveLength(Object.keys(CHAR_PALETTES).length * 3 + PROP_NAMES.length);
    // urls all live under assets/
    expect(assets.every(a => a.url.startsWith('assets/'))).toBe(true);
    // keys are unique
    expect(new Set(assets.map(a => a.key)).size).toBe(assets.length);
  });
});
