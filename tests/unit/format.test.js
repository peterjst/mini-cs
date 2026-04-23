import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule, freshGame } from '../helpers.js';

beforeAll(() => {
  freshGame();
  loadModule('js/core/format.js');
});

describe('GAME.format', () => {
  describe('int', () => {
    it('renders single digits as-is', () => {
      expect(GAME.format.int(0)).toBe('0');
      expect(GAME.format.int(7)).toBe('7');
    });

    it('renders sub-thousand values without commas', () => {
      expect(GAME.format.int(999)).toBe('999');
    });

    it('renders thousands with commas', () => {
      expect(GAME.format.int(1000)).toBe('1,000');
      expect(GAME.format.int(1420)).toBe('1,420');
      expect(GAME.format.int(12345)).toBe('12,345');
      expect(GAME.format.int(1234567)).toBe('1,234,567');
    });

    it('coerces non-integers by flooring', () => {
      expect(GAME.format.int(1420.9)).toBe('1,420');
    });

    it('handles negative values', () => {
      expect(GAME.format.int(-1500)).toBe('-1,500');
    });

    it('treats null/undefined/NaN as 0', () => {
      expect(GAME.format.int(null)).toBe('0');
      expect(GAME.format.int(undefined)).toBe('0');
      expect(GAME.format.int(NaN)).toBe('0');
    });
  });

  describe('percent', () => {
    it('returns "0%" when denominator is 0', () => {
      expect(GAME.format.percent(0, 0)).toBe('0%');
      expect(GAME.format.percent(5, 0)).toBe('0%');
    });

    it('rounds to nearest integer', () => {
      expect(GAME.format.percent(1, 3)).toBe('33%');
      expect(GAME.format.percent(2, 3)).toBe('67%');
      expect(GAME.format.percent(12, 37)).toBe('32%');
    });

    it('returns "100%" when numerator equals denominator', () => {
      expect(GAME.format.percent(5, 5)).toBe('100%');
    });

    it('treats null/undefined inputs safely as 0%', () => {
      expect(GAME.format.percent(null, 10)).toBe('0%');
      expect(GAME.format.percent(5, null)).toBe('0%');
    });
  });

  describe('percentValue', () => {
    it('rounds and appends %', () => {
      expect(GAME.format.percentValue(42.6)).toBe('43%');
      expect(GAME.format.percentValue(42.4)).toBe('42%');
      expect(GAME.format.percentValue(0)).toBe('0%');
      expect(GAME.format.percentValue(100)).toBe('100%');
    });

    it('treats null/NaN as 0%', () => {
      expect(GAME.format.percentValue(null)).toBe('0%');
      expect(GAME.format.percentValue(NaN)).toBe('0%');
    });
  });

  describe('time', () => {
    it('formats whole seconds as M:SS with zero-padded seconds', () => {
      expect(GAME.format.time(0)).toBe('0:00');
      expect(GAME.format.time(5)).toBe('0:05');
      expect(GAME.format.time(59)).toBe('0:59');
      expect(GAME.format.time(60)).toBe('1:00');
      expect(GAME.format.time(108)).toBe('1:48');
      expect(GAME.format.time(3599)).toBe('59:59');
    });

    it('floors fractional seconds', () => {
      expect(GAME.format.time(59.9)).toBe('0:59');
      expect(GAME.format.time(90.1)).toBe('1:30');
    });

    it('clamps negative seconds to 0:00', () => {
      expect(GAME.format.time(-5)).toBe('0:00');
    });

    it('treats null/NaN as 0:00', () => {
      expect(GAME.format.time(null)).toBe('0:00');
      expect(GAME.format.time(NaN)).toBe('0:00');
    });
  });

  describe('ratioPair', () => {
    it('returns primary + sub strings with " / "', () => {
      expect(GAME.format.ratioPair(12, 8)).toEqual({ primary: '12', sub: ' / 8' });
      expect(GAME.format.ratioPair(0, 0)).toEqual({ primary: '0', sub: ' / 0' });
    });

    it('applies integer formatting to large values', () => {
      expect(GAME.format.ratioPair(1420, 37)).toEqual({ primary: '1,420', sub: ' / 37' });
    });
  });

  describe('titleCase', () => {
    it('uppercases the first letter and lowercases the rest', () => {
      expect(GAME.format.titleCase('normal')).toBe('Normal');
      expect(GAME.format.titleCase('HARD')).toBe('Hard');
      expect(GAME.format.titleCase('')).toBe('');
    });

    it('handles null/undefined as empty string', () => {
      expect(GAME.format.titleCase(null)).toBe('');
      expect(GAME.format.titleCase(undefined)).toBe('');
    });
  });
});
