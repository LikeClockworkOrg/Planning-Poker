import type { FibonacciValue } from './constants.js';

export interface Participant {
  id: string;
  displayName: string;
  isHost: boolean;
  hasVoted: boolean;
}

export interface Vote {
  participantId: string;
  displayName: string;
  value: FibonacciValue;
}

export type RoundStatus = 'voting' | 'revealed';

export interface Round {
  id: string;
  topic: string;
  status: RoundStatus;
  votes: Vote[];
  startedAt: string;
  revealedAt?: string;
}

export interface Room {
  code: string;
  hostTokenHash: string;
  currentRound: Round;
  participants: Participant[];
  history: Round[];
}

// Client-facing versions with masked votes during voting
export interface ClientRound {
  id: string;
  topic: string;
  status: RoundStatus;
  votes: Vote[]; // Empty array during voting; populated after reveal
  votedParticipantIds: string[]; // Who has voted (no values) during voting
  startedAt: string;
  revealedAt?: string;
  result?: RoundResult;
}

export interface ClientRoom {
  code: string;
  currentRound: ClientRound;
  participants: Participant[];
  history: ClientRound[];
}

export interface RoundResult {
  average: number;
  median: number;
  mode: FibonacciValue[];
}

export interface CreateRoomRequest {
  displayName: string;
  topic?: string;
}

export interface CreateRoomResponse {
  roomCode: string;
  hostToken: string;
  participantId: string;
}

export interface JoinRoomRequest {
  roomCode: string;
  displayName: string;
}

export interface RoomExistsResponse {
  exists: boolean;
}
