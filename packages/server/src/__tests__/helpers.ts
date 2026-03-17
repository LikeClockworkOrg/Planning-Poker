import crypto from 'node:crypto';
import type { Room, Round, FibonacciValue } from '@planning-poker/shared';
import { hashToken } from '../room.js';

export function makeRoom(overrides?: Partial<Room>): Room {
  const hostToken = 'test-host-token';
  return {
    code: 'ABCDEF',
    hostTokenHash: hashToken(hostToken),
    currentRound: {
      id: crypto.randomUUID(),
      topic: '',
      status: 'voting',
      votes: [],
      startedAt: new Date().toISOString(),
    },
    participants: [
      { id: 'host-1', displayName: 'Host', isHost: true, hasVoted: false },
    ],
    history: [],
    ...overrides,
  };
}

export function makeRound(
  votes: { participantId: string; displayName: string; value: FibonacciValue }[],
  status: 'voting' | 'revealed' = 'voting',
): Round {
  return {
    id: crypto.randomUUID(),
    topic: 'Test topic',
    status,
    votes,
    startedAt: new Date().toISOString(),
  };
}
