import { describe, it, expect } from 'vitest';
import {
  FIBONACCI_VALUES,
  ROOM_CODE_CHARSET,
  ROOM_CODE_LENGTH,
  MAX_PARTICIPANTS,
} from '../constants.js';

describe('FIBONACCI_VALUES', () => {
  it('contains the expected values', () => {
    expect([...FIBONACCI_VALUES]).toEqual([1, 2, 3, 5, 8, 13, 21]);
  });

  it('is sorted ascending', () => {
    for (let i = 1; i < FIBONACCI_VALUES.length; i++) {
      expect(FIBONACCI_VALUES[i]).toBeGreaterThan(FIBONACCI_VALUES[i - 1]);
    }
  });
});

describe('ROOM_CODE_CHARSET', () => {
  it('excludes ambiguous characters (0, O, I, L, 1)', () => {
    expect(ROOM_CODE_CHARSET).not.toContain('0');
    expect(ROOM_CODE_CHARSET).not.toContain('O');
    expect(ROOM_CODE_CHARSET).not.toContain('I');
    expect(ROOM_CODE_CHARSET).not.toContain('L');
    expect(ROOM_CODE_CHARSET).not.toContain('1');
  });

  it('has a reasonable length', () => {
    expect(ROOM_CODE_CHARSET.length).toBeGreaterThan(20);
  });
});

describe('ROOM_CODE_LENGTH', () => {
  it('is 6', () => {
    expect(ROOM_CODE_LENGTH).toBe(6);
  });
});

describe('MAX_PARTICIPANTS', () => {
  it('is 50', () => {
    expect(MAX_PARTICIPANTS).toBe(50);
  });
});
