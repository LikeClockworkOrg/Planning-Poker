import crypto from 'node:crypto';
import { redis } from './redis.js';
import { generateUniqueRoomCode } from './roomCode.js';
import {
  ROOM_TTL_SECONDS,
  FIBONACCI_VALUES,
  MAX_PARTICIPANTS,
  type Room,
  type ClientRoom,
  type ClientRound,
  type Round,
  type RoundResult,
  type FibonacciValue,
  type Participant,
} from '@planning-poker/shared';

function redisKey(code: string): string {
  return `room:${code}`;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function getRoom(code: string): Promise<Room | null> {
  const data = await redis.get(redisKey(code));
  if (!data) return null;
  return JSON.parse(data) as Room;
}

export async function saveRoom(room: Room): Promise<void> {
  await redis.set(redisKey(room.code), JSON.stringify(room), 'EX', ROOM_TTL_SECONDS);
}

export async function roomExists(code: string): Promise<boolean> {
  return (await redis.exists(redisKey(code))) === 1;
}

export async function createRoom(displayName: string, topic = ''): Promise<{
  room: Room;
  hostToken: string;
  participantId: string;
}> {
  const code = await generateUniqueRoomCode();
  const hostToken = crypto.randomBytes(32).toString('hex');
  const hostTokenHash = hashToken(hostToken);
  const participantId = crypto.randomUUID();

  const room: Room = {
    code,
    hostTokenHash,
    currentRound: {
      id: crypto.randomUUID(),
      topic,
      status: 'voting',
      votes: [],
      startedAt: new Date().toISOString(),
    },
    participants: [
      {
        id: participantId,
        displayName,
        isHost: true,
        hasVoted: false,
      },
    ],
    history: [],
  };

  await saveRoom(room);
  return { room, hostToken, participantId };
}

export function verifyHost(room: Room, hostToken: string): boolean {
  return room.hostTokenHash === hashToken(hostToken);
}

export function addParticipant(
  room: Room,
  displayName: string,
  participantId?: string,
): Participant {
  if (room.participants.length >= MAX_PARTICIPANTS) {
    throw new Error('Room is full');
  }

  const id = participantId || crypto.randomUUID();
  const participant: Participant = {
    id,
    displayName,
    isHost: false,
    hasVoted: false,
  };
  room.participants.push(participant);
  return participant;
}

export function removeParticipant(room: Room, participantId: string): void {
  room.participants = room.participants.filter((p) => p.id !== participantId);
}

export function submitVote(
  room: Room,
  participantId: string,
  value: FibonacciValue,
): void {
  if (room.currentRound.status !== 'voting') {
    throw new Error('Round is not in voting state');
  }
  if (!FIBONACCI_VALUES.includes(value)) {
    throw new Error('Invalid vote value');
  }
  const participant = room.participants.find((p) => p.id === participantId);
  if (!participant) {
    throw new Error('Participant not found');
  }

  // Remove existing vote if any
  room.currentRound.votes = room.currentRound.votes.filter(
    (v) => v.participantId !== participantId,
  );

  room.currentRound.votes.push({
    participantId,
    displayName: participant.displayName,
    value,
  });
  participant.hasVoted = true;
}

export function revealRound(room: Room): RoundResult {
  room.currentRound.status = 'revealed';
  room.currentRound.revealedAt = new Date().toISOString();
  return calculateResult(room.currentRound);
}

export function startNewRound(room: Room, topic: string = ''): Round {
  // Move current round to history
  room.history.unshift(room.currentRound);

  // Reset participant vote status
  for (const p of room.participants) {
    p.hasVoted = false;
  }

  const newRound: Round = {
    id: crypto.randomUUID(),
    topic,
    status: 'voting',
    votes: [],
    startedAt: new Date().toISOString(),
  };
  room.currentRound = newRound;
  return newRound;
}

export function calculateResult(round: Round): RoundResult {
  const values = round.votes.map((v) => v.value).sort((a, b) => a - b);

  if (values.length === 0) {
    return { average: 0, median: 0, mode: [] };
  }

  const average =
    Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;

  const mid = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0
      ? Math.round(((values[mid - 1] + values[mid]) / 2) * 10) / 10
      : values[mid];

  // Mode
  const freq = new Map<FibonacciValue, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) || 0) + 1);
  }
  const maxFreq = Math.max(...freq.values());
  const mode = [...freq.entries()]
    .filter(([, count]) => count === maxFreq)
    .map(([val]) => val);

  return { average, median, mode };
}

export function toClientRound(round: Round): ClientRound {
  if (round.status === 'voting') {
    return {
      id: round.id,
      topic: round.topic,
      status: round.status,
      votes: [],
      votedParticipantIds: round.votes.map((v) => v.participantId),
      startedAt: round.startedAt,
    };
  }
  return {
    id: round.id,
    topic: round.topic,
    status: round.status,
    votes: round.votes,
    votedParticipantIds: round.votes.map((v) => v.participantId),
    startedAt: round.startedAt,
    revealedAt: round.revealedAt,
    result: calculateResult(round),
  };
}

export function toClientRoom(room: Room): ClientRoom {
  return {
    code: room.code,
    currentRound: toClientRound(room.currentRound),
    participants: room.participants,
    history: room.history.map(toClientRound),
  };
}
