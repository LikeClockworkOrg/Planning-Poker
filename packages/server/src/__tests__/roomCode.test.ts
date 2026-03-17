import { describe, it, expect } from 'vitest';
import { ROOM_CODE_CHARSET, ROOM_CODE_LENGTH } from '@planning-poker/shared';
import { generateRoomCode } from '../roomCode.js';

describe('generateRoomCode', () => {
  it('returns a string of the correct length', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
  });

  it('only contains characters from the charset', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      for (const char of code) {
        expect(ROOM_CODE_CHARSET).toContain(char);
      }
    }
  });
});
