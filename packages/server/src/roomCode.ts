import crypto from 'node:crypto';
import { ROOM_CODE_CHARSET, ROOM_CODE_LENGTH } from '@planning-poker/shared';
import { redis } from './redis.js';

export function generateRoomCode(): string {
  const bytes = crypto.randomBytes(ROOM_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARSET[bytes[i] % ROOM_CODE_CHARSET.length];
  }
  return code;
}

export async function generateUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode();
    const exists = await redis.exists(`room:${code}`);
    if (!exists) return code;
  }
  throw new Error('Failed to generate unique room code');
}
