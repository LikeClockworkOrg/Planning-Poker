import type { ClientRoom, ClientRound, Participant, RoundResult, Vote } from './types.js';
import type { FibonacciValue } from './constants.js';

// Client → Server events
export enum ClientEvent {
  RoomJoin = 'room:join',
  RoomLeave = 'room:leave',
  VoteSubmit = 'vote:submit',
  RoundReveal = 'round:reveal',
  RoundNew = 'round:new',
  RoundSetTopic = 'round:set-topic',
}

// Server → Client events
export enum ServerEvent {
  RoomState = 'room:state',
  ParticipantJoined = 'room:participant-joined',
  ParticipantLeft = 'room:participant-left',
  VoteReceived = 'vote:received',
  RoundRevealed = 'round:revealed',
  RoundStarted = 'round:started',
  RoundTopicUpdated = 'round:topic-updated',
  Error = 'error',
}

// Payload types for client → server
export interface ClientToServerEvents {
  [ClientEvent.RoomJoin]: (data: {
    roomCode: string;
    displayName: string;
    participantId?: string;
    hostToken?: string;
  }) => void;
  [ClientEvent.RoomLeave]: () => void;
  [ClientEvent.VoteSubmit]: (data: { value: FibonacciValue }) => void;
  [ClientEvent.RoundReveal]: (data: { hostToken: string }) => void;
  [ClientEvent.RoundNew]: (data: { hostToken: string; topic?: string }) => void;
  [ClientEvent.RoundSetTopic]: (data: {
    hostToken: string;
    topic: string;
  }) => void;
}

// Payload types for server → client
export interface ServerToClientEvents {
  [ServerEvent.RoomState]: (data: {
    room: ClientRoom;
    participantId: string;
  }) => void;
  [ServerEvent.ParticipantJoined]: (data: { participant: Participant }) => void;
  [ServerEvent.ParticipantLeft]: (data: { participantId: string }) => void;
  [ServerEvent.VoteReceived]: (data: { participantId: string }) => void;
  [ServerEvent.RoundRevealed]: (data: {
    round: ClientRound;
    result: RoundResult;
  }) => void;
  [ServerEvent.RoundStarted]: (data: { round: ClientRound; history: ClientRound[] }) => void;
  [ServerEvent.RoundTopicUpdated]: (data: { topic: string }) => void;
  [ServerEvent.Error]: (data: { message: string }) => void;
}
