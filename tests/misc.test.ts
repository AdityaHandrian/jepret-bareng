import { describe, expect, it } from 'vitest';
import { applyFilterPixels, filterCss, FILTERS, getFilter } from '../src/compose/filters';
import { boomerangOrder } from '../src/compose/gif';
import { pickRandom } from '../src/camera/challenges';
import { makeCode, MAX_PARTICIPANTS, normalizeCode } from '../src/room/protocol';

describe('filter warna', () => {
  it('Normal tidak mengubah piksel', () => {
    const px = new Uint8ClampedArray([10, 120, 250, 255]);
    applyFilterPixels(px, getFilter('normal'));
    expect([...px]).toEqual([10, 120, 250, 255]);
  });

  it('Hitam-Putih membuat R=G=B', () => {
    const px = new Uint8ClampedArray([200, 50, 30, 255]);
    applyFilterPixels(px, getFilter('hitamputih'));
    expect(px[0]).toBe(px[1]);
    expect(px[1]).toBe(px[2]);
    expect(px[3]).toBe(255);
  });

  it('Kartun memposterisasi ke sedikit tingkat warna', () => {
    const px = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) px.set([i, i, i, 255], i * 4);
    applyFilterPixels(px, getFilter('kartun'));
    const levels = new Set<number>();
    for (let i = 0; i < 256; i++) levels.add(px[i * 4]);
    expect(levels.size).toBeLessThanOrEqual(6);
  });

  it('setiap filter punya CSS pratinjau yang valid', () => {
    for (const f of FILTERS) expect(filterCss(f)).toMatch(/^(none|[a-z]+\([\d.]+\)( [a-z]+\([\d.]+\))*)$/);
  });
});

describe('kode bilik', () => {
  it('6 karakter tanpa huruf/angka yang mirip', () => {
    for (let i = 0; i < 200; i++) {
      const c = makeCode();
      expect(c).toMatch(/^[A-Z2-9]{6}$/);
      expect(c).not.toMatch(/[01IL]/);
      expect(normalizeCode(c)).toBe(c);
    }
  });

  it('menerima huruf kecil dan spasi, menolak yang tidak valid', () => {
    expect(normalizeCode(' abc 234 ')).toBe('ABC234');
    expect(normalizeCode('ABC23')).toBeNull();
    expect(normalizeCode('ABC231')).toBeNull();
  });

  it('batas peserta: berdua 2, geng 4', () => {
    expect(MAX_PARTICIPANTS.duo).toBe(2);
    expect(MAX_PARTICIPANTS.geng).toBe(4);
  });
});

describe('lain-lain', () => {
  it('urutan boomerang kembali mulus', () => {
    expect(boomerangOrder(4)).toEqual([0, 1, 2, 3, 2, 1]);
    expect(boomerangOrder(3)).toEqual([0, 1, 2, 1]);
    expect(boomerangOrder(1)).toEqual([0]);
  });

  it('tantangan acak tidak berulang selama daftar cukup', () => {
    const list = ['a', 'b', 'c', 'd'];
    const picked = pickRandom(list, 4);
    expect(new Set(picked).size).toBe(4);
    expect(pickRandom(list, 6)).toHaveLength(6);
  });
});
