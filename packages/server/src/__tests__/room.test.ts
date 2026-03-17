import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import type { Room, Round, FibonacciValue } from '@planning-poker/shared';
import {
  hashToken,
  verifyHost,
  addParticipant,
  removeParticipant,
  submitVote,
  revealRound,
  startNewRound,
  calculateResult,
  toClientRound,
  toClientRoom,
} from '../room.js';

function makeRoom(overrides?: Partial<Room>): Room {
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

function makeRound(votes: { participantId: string; displayName: string; value: FibonacciValue }[], status: 'voting' | 'revealed' = 'voting'): Round {
  return {
    id: crypto.randomUUID(),
    topic: 'Test topic',
    status,
    votes,
    startedAt: new Date().toISOString(),
  };
}

// --- hashToken ---

describe('hashToken', () => {
  it('returns a deterministic SHA-256 hex hash', () => {
    const hash = hashToken('my-secret');
    expect(hash).toHaveLength(64);
    expect(hashToken('my-secret')).toBe(hash);
  });

  it('returns different hashes for different inputs', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});

// --- verifyHost ---

describe('verifyHost', () => {
  it('returns true for the correct token', () => {
    const room = makeRoom();
    expect(verifyHost(room, 'test-host-token')).toBe(true);
  });

  it('returns false for a wrong token', () => {
    const room = makeRoom();
    expect(verifyHost(room, 'wrong-token')).toBe(false);
  });
});

// --- addParticipant ---

describe('addParticipant', () => {
  it('adds a participant to the room', () => {
    const room = makeRoom();
    const p = addParticipant(room, 'Alice');
    expect(room.participants).toHaveLength(2);
    expect(p.displayName).toBe('Alice');
    expect(p.isHost).toBe(false);
    expect(p.hasVoted).toBe(false);
  });

  it('uses the provided participantId', () => {
    const room = makeRoom();
    const p = addParticipant(room, 'Bob', 'custom-id');
    expect(p.id).toBe('custom-id');
  });

  it('generates an id if none provided', () => {
    const room = makeRoom();
    const p = addParticipant(room, 'Charlie');
    expect(p.id).toBeTruthy();
    expect(typeof p.id).toBe('string');
  });

  it('throws when the room is full', () => {
    const room = makeRoom({
      participants: Array.from({ length: 50 }, (_, i) => ({
        id: `p-${i}`,
        displayName: `User ${i}`,
        isHost: i === 0,
        hasVoted: false,
      })),
    });
    expect(() => addParticipant(room, 'Overflow')).toThrow('Room is full');
  });
});

// --- removeParticipant ---

describe('removeParticipant', () => {
  it('removes the specified participant', () => {
    const room = makeRoom();
    addParticipant(room, 'Alice', 'alice-id');
    expect(room.participants).toHaveLength(2);
    removeParticipant(room, 'alice-id');
    expect(room.participants).toHaveLength(1);
    expect(room.participants[0].id).toBe('host-1');
  });

  it('does nothing if participant not found', () => {
    const room = makeRoom();
    removeParticipant(room, 'nonexistent');
    expect(room.participants).toHaveLength(1);
  });
});

// --- submitVote ---

describe('submitVote', () => {
  it('adds a vote to the current round', () => {
    const room = makeRoom();
    submitVote(room, 'host-1', 5);
    expect(room.currentRound.votes).toHaveLength(1);
    expect(room.currentRound.votes[0]).toEqual({
      participantId: 'host-1',
      displayName: 'Host',
      value: 5,
    });
  });

  it('sets hasVoted on the participant', () => {
    const room = makeRoom();
    submitVote(room, 'host-1', 3);
    expect(room.participants[0].hasVoted).toBe(true);
  });

  it('replaces an existing vote from the same participant', () => {
    const room = makeRoom();
    submitVote(room, 'host-1', 3);
    submitVote(room, 'host-1', 8);
    expect(room.currentRound.votes).toHaveLength(1);
    expect(room.currentRound.votes[0].value).toBe(8);
  });

  it('throws if round is not voting', () => {
    const room = makeRoom();
    room.currentRound.status = 'revealed';
    expect(() => submitVote(room, 'host-1', 5)).toThrow(
      'Round is not in voting state',
    );
  });

  it('throws for an invalid vote value', () => {
    const room = makeRoom();
    expect(() => submitVote(room, 'host-1', 4 as FibonacciValue)).toThrow(
      'Invalid vote value',
    );
  });

  it('throws if participant not found', () => {
    const room = makeRoom();
    expect(() => submitVote(room, 'nonexistent', 5)).toThrow(
      'Participant not found',
    );
  });
});

// --- revealRound ---

describe('revealRound', () => {
  it('sets status to revealed and returns the result', () => {
    const room = makeRoom();
    submitVote(room, 'host-1', 5);
    const result = revealRound(room);
    expect(room.currentRound.status).toBe('revealed');
    expect(room.currentRound.revealedAt).toBeTruthy();
    expect(result.average).toBe(5);
  });
});

// --- startNewRound ---

describe('startNewRound', () => {
  it('archives the current round and creates a new one', () => {
    const room = makeRoom();
    submitVote(room, 'host-1', 5);
    const oldRoundId = room.currentRound.id;
    const newRound = startNewRound(room, 'Next topic');
    expect(room.history).toHaveLength(1);
    expect(room.history[0].id).toBe(oldRoundId);
    expect(newRound.topic).toBe('Next topic');
    expect(newRound.status).toBe('voting');
    expect(newRound.votes).toEqual([]);
  });

  it('resets hasVoted for all participants', () => {
    const room = makeRoom();
    submitVote(room, 'host-1', 5);
    expect(room.participants[0].hasVoted).toBe(true);
    startNewRound(room);
    expect(room.participants[0].hasVoted).toBe(false);
  });
});

// --- calculateResult ---

describe('calculateResult', () => {
  it('returns zeros for empty votes', () => {
    const round = makeRound([]);
    expect(calculateResult(round)).toEqual({ average: 0, median: 0, mode: [] });
  });

  it('handles a single vote', () => {
    const round = makeRound([
      { participantId: 'a', displayName: 'A', value: 5 },
    ]);
    const result = calculateResult(round);
    expect(result.average).toBe(5);
    expect(result.median).toBe(5);
    expect(result.mode).toEqual([5]);
  });

  it('calculates correct stats for multiple votes', () => {
    const round = makeRound([
      { participantId: 'a', displayName: 'A', value: 1 },
      { participantId: 'b', displayName: 'B', value: 2 },
      { participantId: 'c', displayName: 'C', value: 3 },
      { participantId: 'd', displayName: 'D', value: 5 },
      { participantId: 'e', displayName: 'E', value: 8 },
    ]);
    const result = calculateResult(round);
    expect(result.average).toBe(3.8);
    expect(result.median).toBe(3);
    expect(result.mode).toEqual([1, 2, 3, 5, 8]); // all tied at freq 1
  });

  it('calculates median for even number of votes', () => {
    const round = makeRound([
      { participantId: 'a', displayName: 'A', value: 1 },
      { participantId: 'b', displayName: 'B', value: 3 },
      { participantId: 'c', displayName: 'C', value: 5 },
      { participantId: 'd', displayName: 'D', value: 8 },
    ]);
    const result = calculateResult(round);
    expect(result.median).toBe(4);
  });

  it('identifies a tied mode', () => {
    const round = makeRound([
      { participantId: 'a', displayName: 'A', value: 1 },
      { participantId: 'b', displayName: 'B', value: 1 },
      { participantId: 'c', displayName: 'C', value: 3 },
      { participantId: 'd', displayName: 'D', value: 3 },
    ]);
    const result = calculateResult(round);
    expect(result.mode).toEqual([1, 3]);
  });

  it('identifies a single mode', () => {
    const round = makeRound([
      { participantId: 'a', displayName: 'A', value: 5 },
      { participantId: 'b', displayName: 'B', value: 5 },
      { participantId: 'c', displayName: 'C', value: 3 },
    ]);
    const result = calculateResult(round);
    expect(result.mode).toEqual([5]);
  });
});

// --- toClientRound ---

describe('toClientRound', () => {
  it('masks votes during voting phase', () => {
    const round = makeRound([
      { participantId: 'a', displayName: 'A', value: 5 },
      { participantId: 'b', displayName: 'B', value: 3 },
    ]);
    const clientRound = toClientRound(round);
    expect(clientRound.votes).toEqual([]);
    expect(clientRound.votedParticipantIds).toEqual(['a', 'b']);
  });

  it('exposes votes after reveal', () => {
    const round = makeRound(
      [
        { participantId: 'a', displayName: 'A', value: 5 },
      ],
      'revealed',
    );
    const clientRound = toClientRound(round);
    expect(clientRound.votes).toHaveLength(1);
    expect(clientRound.votes[0].value).toBe(5);
    expect(clientRound.result).toBeDefined();
  });
});

// --- toClientRoom ---

describe('toClientRoom', () => {
  it('omits hostTokenHash', () => {
    const room = makeRoom();
    const clientRoom = toClientRoom(room);
    expect((clientRoom as any).hostTokenHash).toBeUndefined();
    expect(clientRoom.code).toBe('ABCDEF');
    expect(clientRoom.participants).toHaveLength(1);
  });

  it('maps history through toClientRound', () => {
    const room = makeRoom();
    submitVote(room, 'host-1', 5);
    revealRound(room);
    startNewRound(room, 'Round 2');
    const clientRoom = toClientRoom(room);
    expect(clientRoom.history).toHaveLength(1);
    expect(clientRoom.history[0].result).toBeDefined();
  });
});
