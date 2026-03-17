import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ClientEvent,
  ServerEvent,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_TOPIC_LENGTH,
} from '@planning-poker/shared';
import { setupSocketHandlers } from '../socket.js';
import { makeRoom } from './helpers.js';

vi.mock('../room.js', () => ({
  getRoom: vi.fn(),
  saveRoom: vi.fn(),
  addParticipant: vi.fn(),
  removeParticipant: vi.fn(),
  submitVote: vi.fn(),
  revealRound: vi.fn(),
  startNewRound: vi.fn(),
  toClientRoom: vi.fn(),
  toClientRound: vi.fn(),
  verifyHost: vi.fn(),
  hashToken: vi.fn(),
  calculateResult: vi.fn(),
}));

import {
  getRoom,
  saveRoom,
  addParticipant,
  removeParticipant,
  submitVote,
  revealRound,
  startNewRound,
  toClientRoom,
  toClientRound,
  verifyHost,
} from '../room.js';

const mockGetRoom = vi.mocked(getRoom);
const mockSaveRoom = vi.mocked(saveRoom);
const mockAddParticipant = vi.mocked(addParticipant);
const mockRemoveParticipant = vi.mocked(removeParticipant);
const mockSubmitVote = vi.mocked(submitVote);
const mockRevealRound = vi.mocked(revealRound);
const mockStartNewRound = vi.mocked(startNewRound);
const mockToClientRoom = vi.mocked(toClientRoom);
const mockToClientRound = vi.mocked(toClientRound);
const mockVerifyHost = vi.mocked(verifyHost);

type Handler = (...args: any[]) => any;

function createMockSocket() {
  const handlers = new Map<string, Handler>();
  const socket = {
    data: {} as Record<string, any>,
    on: vi.fn((event: string, handler: Handler) => {
      handlers.set(event, handler);
    }),
    emit: vi.fn(),
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn(),
    to: vi.fn(() => ({ emit: socket.broadcastEmit })),
    broadcastEmit: vi.fn(),
    _handlers: handlers,
  };
  return socket;
}

function createMockIo() {
  const connectionHandlers: Handler[] = [];
  const io = {
    on: vi.fn((event: string, handler: Handler) => {
      if (event === 'connection') connectionHandlers.push(handler);
    }),
    to: vi.fn(() => ({ emit: io.roomEmit })),
    roomEmit: vi.fn(),
    _connectionHandlers: connectionHandlers,
  };
  return io;
}

function setup() {
  const io = createMockIo();
  setupSocketHandlers(io as any);
  const socket = createMockSocket();
  // Trigger connection
  io._connectionHandlers[0](socket);
  return { io, socket };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- room:join ---

describe('room:join', () => {
  it('rejects empty displayName', async () => {
    const { socket } = setup();
    const handler = socket._handlers.get(ClientEvent.RoomJoin)!;
    await handler({ roomCode: 'ABCDEF', displayName: '' });

    expect(socket.emit).toHaveBeenCalledWith(ServerEvent.Error, {
      message: 'Invalid display name',
    });
  });

  it('rejects displayName exceeding MAX_DISPLAY_NAME_LENGTH', async () => {
    const { socket } = setup();
    const handler = socket._handlers.get(ClientEvent.RoomJoin)!;
    await handler({
      roomCode: 'ABCDEF',
      displayName: 'A'.repeat(MAX_DISPLAY_NAME_LENGTH + 1),
    });

    expect(socket.emit).toHaveBeenCalledWith(ServerEvent.Error, {
      message: 'Invalid display name',
    });
  });

  it('emits error when room not found', async () => {
    const { socket } = setup();
    mockGetRoom.mockResolvedValue(null);

    const handler = socket._handlers.get(ClientEvent.RoomJoin)!;
    await handler({ roomCode: 'ABCDEF', displayName: 'Alice' });

    expect(socket.emit).toHaveBeenCalledWith(ServerEvent.Error, {
      message: 'Room not found',
    });
  });

  it('adds new participant and broadcasts join', async () => {
    const { io, socket } = setup();
    const room = makeRoom();
    const newParticipant = { id: 'p-new', displayName: 'Alice', isHost: false, hasVoted: false };
    const clientRoom = { code: 'ABCDEF' };

    mockGetRoom.mockResolvedValue(room);
    mockAddParticipant.mockReturnValue(newParticipant);
    mockSaveRoom.mockResolvedValue(undefined);
    mockToClientRoom.mockReturnValue(clientRoom as any);

    const handler = socket._handlers.get(ClientEvent.RoomJoin)!;
    await handler({ roomCode: 'ABCDEF', displayName: 'Alice' });

    expect(mockAddParticipant).toHaveBeenCalledWith(room, 'Alice', undefined);
    expect(socket.join).toHaveBeenCalledWith('ABCDEF');
    expect(socket.data.roomCode).toBe('ABCDEF');
    expect(socket.data.participantId).toBe('p-new');

    // Broadcast to room (via socket.to)
    expect(socket.to).toHaveBeenCalledWith('ABCDEF');
    expect(socket.broadcastEmit).toHaveBeenCalledWith(
      ServerEvent.ParticipantJoined,
      { participant: newParticipant },
    );

    // Emit room state to joining socket
    expect(socket.emit).toHaveBeenCalledWith(ServerEvent.RoomState, {
      room: clientRoom,
      participantId: 'p-new',
    });
  });

  it('reconnects existing participant without addParticipant', async () => {
    const { socket } = setup();
    const room = makeRoom({
      participants: [
        { id: 'host-1', displayName: 'Host', isHost: true, hasVoted: false },
        { id: 'existing-p', displayName: 'OldName', isHost: false, hasVoted: false },
      ],
    });
    const clientRoom = { code: 'ABCDEF' };

    mockGetRoom.mockResolvedValue(room);
    mockSaveRoom.mockResolvedValue(undefined);
    mockToClientRoom.mockReturnValue(clientRoom as any);

    const handler = socket._handlers.get(ClientEvent.RoomJoin)!;
    await handler({
      roomCode: 'ABCDEF',
      displayName: 'NewName',
      participantId: 'existing-p',
    });

    expect(mockAddParticipant).not.toHaveBeenCalled();
    // Display name updated
    expect(room.participants[1].displayName).toBe('NewName');
    expect(socket.data.participantId).toBe('existing-p');
  });

  it('sets isHost when hostToken is valid on join', async () => {
    const { socket } = setup();
    const room = makeRoom();
    const newParticipant = { id: 'p-host', displayName: 'HostUser', isHost: false, hasVoted: false };
    const clientRoom = { code: 'ABCDEF' };

    mockGetRoom.mockResolvedValue(room);
    mockAddParticipant.mockReturnValue(newParticipant);
    mockVerifyHost.mockReturnValue(true);
    mockSaveRoom.mockResolvedValue(undefined);
    mockToClientRoom.mockReturnValue(clientRoom as any);

    const handler = socket._handlers.get(ClientEvent.RoomJoin)!;
    await handler({
      roomCode: 'ABCDEF',
      displayName: 'HostUser',
      hostToken: 'valid-token',
    });

    expect(mockVerifyHost).toHaveBeenCalledWith(room, 'valid-token');
    expect(newParticipant.isHost).toBe(true);
  });
});

// --- vote:submit ---

describe('vote:submit', () => {
  it('silently returns when no roomCode on socket', async () => {
    const { socket } = setup();
    socket.data = {};

    const handler = socket._handlers.get(ClientEvent.VoteSubmit)!;
    await handler({ value: 5 });

    expect(socket.emit).not.toHaveBeenCalled();
    expect(mockGetRoom).not.toHaveBeenCalled();
  });

  it('emits error for invalid vote value', async () => {
    const { socket } = setup();
    socket.data = { roomCode: 'ABCDEF', participantId: 'p-1' };

    const handler = socket._handlers.get(ClientEvent.VoteSubmit)!;
    await handler({ value: 4 }); // 4 is not a Fibonacci value

    expect(socket.emit).toHaveBeenCalledWith(ServerEvent.Error, {
      message: 'Invalid vote value',
    });
  });

  it('submits valid vote and broadcasts', async () => {
    const { io, socket } = setup();
    socket.data = { roomCode: 'ABCDEF', participantId: 'p-1' };
    const room = makeRoom();

    mockGetRoom.mockResolvedValue(room);
    mockSaveRoom.mockResolvedValue(undefined);

    const handler = socket._handlers.get(ClientEvent.VoteSubmit)!;
    await handler({ value: 5 });

    expect(mockSubmitVote).toHaveBeenCalledWith(room, 'p-1', 5);
    expect(mockSaveRoom).toHaveBeenCalledWith(room);
    expect(io.to).toHaveBeenCalledWith('ABCDEF');
    expect(io.roomEmit).toHaveBeenCalledWith(ServerEvent.VoteReceived, {
      participantId: 'p-1',
    });
  });
});

// --- round:reveal ---

describe('round:reveal', () => {
  it('emits error when not authorized', async () => {
    const { socket } = setup();
    socket.data = { roomCode: 'ABCDEF', participantId: 'p-1' };
    const room = makeRoom();

    mockGetRoom.mockResolvedValue(room);
    mockVerifyHost.mockReturnValue(false);

    const handler = socket._handlers.get(ClientEvent.RoundReveal)!;
    await handler({ hostToken: 'bad-token' });

    expect(socket.emit).toHaveBeenCalledWith(ServerEvent.Error, {
      message: 'Not authorized',
    });
    expect(mockRevealRound).not.toHaveBeenCalled();
  });

  it('reveals round and broadcasts when authorized', async () => {
    const { io, socket } = setup();
    socket.data = { roomCode: 'ABCDEF', participantId: 'p-1' };
    const room = makeRoom();
    const result = { average: 5, median: 5, mode: [5] };
    const clientRound = { id: 'r-1', status: 'revealed' };

    mockGetRoom.mockResolvedValue(room);
    mockVerifyHost.mockReturnValue(true);
    mockRevealRound.mockReturnValue(result as any);
    mockToClientRound.mockReturnValue(clientRound as any);
    mockSaveRoom.mockResolvedValue(undefined);

    const handler = socket._handlers.get(ClientEvent.RoundReveal)!;
    await handler({ hostToken: 'valid-token' });

    expect(mockRevealRound).toHaveBeenCalledWith(room);
    expect(io.to).toHaveBeenCalledWith('ABCDEF');
    expect(io.roomEmit).toHaveBeenCalledWith(ServerEvent.RoundRevealed, {
      round: clientRound,
      result,
    });
  });
});

// --- round:new ---

describe('round:new', () => {
  it('emits error when not authorized', async () => {
    const { socket } = setup();
    socket.data = { roomCode: 'ABCDEF', participantId: 'p-1' };
    const room = makeRoom();

    mockGetRoom.mockResolvedValue(room);
    mockVerifyHost.mockReturnValue(false);

    const handler = socket._handlers.get(ClientEvent.RoundNew)!;
    await handler({ hostToken: 'bad-token' });

    expect(socket.emit).toHaveBeenCalledWith(ServerEvent.Error, {
      message: 'Not authorized',
    });
    expect(mockStartNewRound).not.toHaveBeenCalled();
  });

  it('starts new round and broadcasts when authorized', async () => {
    const { io, socket } = setup();
    socket.data = { roomCode: 'ABCDEF', participantId: 'p-1' };
    const room = makeRoom();
    const newRound = { id: 'r-2', topic: 'New', status: 'voting' };
    const clientRound = { id: 'r-2', status: 'voting' };

    mockGetRoom.mockResolvedValue(room);
    mockVerifyHost.mockReturnValue(true);
    mockStartNewRound.mockReturnValue(newRound as any);
    mockToClientRound.mockReturnValue(clientRound as any);
    mockSaveRoom.mockResolvedValue(undefined);

    const handler = socket._handlers.get(ClientEvent.RoundNew)!;
    await handler({ hostToken: 'valid-token', topic: '  New  ' });

    expect(mockStartNewRound).toHaveBeenCalledWith(room, 'New');
    expect(io.to).toHaveBeenCalledWith('ABCDEF');
    expect(io.roomEmit).toHaveBeenCalledWith(ServerEvent.RoundStarted, {
      round: clientRound,
      history: [],
    });
  });

  it('truncates topic to MAX_TOPIC_LENGTH', async () => {
    const { socket } = setup();
    socket.data = { roomCode: 'ABCDEF', participantId: 'p-1' };
    const room = makeRoom();

    mockGetRoom.mockResolvedValue(room);
    mockVerifyHost.mockReturnValue(true);
    mockStartNewRound.mockReturnValue({ id: 'r-3' } as any);
    mockToClientRound.mockReturnValue({} as any);
    mockSaveRoom.mockResolvedValue(undefined);

    const handler = socket._handlers.get(ClientEvent.RoundNew)!;
    await handler({
      hostToken: 'valid-token',
      topic: 'X'.repeat(MAX_TOPIC_LENGTH + 50),
    });

    const calledTopic = mockStartNewRound.mock.calls[0][1];
    expect(calledTopic).toHaveLength(MAX_TOPIC_LENGTH);
  });
});

// --- round:set-topic ---

describe('round:set-topic', () => {
  it('emits error when not authorized', async () => {
    const { socket } = setup();
    socket.data = { roomCode: 'ABCDEF', participantId: 'p-1' };
    const room = makeRoom();

    mockGetRoom.mockResolvedValue(room);
    mockVerifyHost.mockReturnValue(false);

    const handler = socket._handlers.get(ClientEvent.RoundSetTopic)!;
    await handler({ hostToken: 'bad-token', topic: 'New topic' });

    expect(socket.emit).toHaveBeenCalledWith(ServerEvent.Error, {
      message: 'Not authorized',
    });
  });

  it('updates topic and broadcasts when authorized', async () => {
    const { io, socket } = setup();
    socket.data = { roomCode: 'ABCDEF', participantId: 'p-1' };
    const room = makeRoom();

    mockGetRoom.mockResolvedValue(room);
    mockVerifyHost.mockReturnValue(true);
    mockSaveRoom.mockResolvedValue(undefined);

    const handler = socket._handlers.get(ClientEvent.RoundSetTopic)!;
    await handler({ hostToken: 'valid-token', topic: '  Updated Topic  ' });

    expect(room.currentRound.topic).toBe('Updated Topic');
    expect(io.to).toHaveBeenCalledWith('ABCDEF');
    expect(io.roomEmit).toHaveBeenCalledWith(ServerEvent.RoundTopicUpdated, {
      topic: 'Updated Topic',
    });
  });
});

// --- room:leave ---

describe('room:leave', () => {
  it('removes participant, broadcasts, and clears socket.data', async () => {
    const { socket } = setup();
    socket.data = { roomCode: 'ABCDEF', participantId: 'p-1' };
    const room = makeRoom();

    mockGetRoom.mockResolvedValue(room);
    mockSaveRoom.mockResolvedValue(undefined);

    const handler = socket._handlers.get(ClientEvent.RoomLeave)!;
    await handler();

    expect(mockRemoveParticipant).toHaveBeenCalledWith(room, 'p-1');
    expect(mockSaveRoom).toHaveBeenCalledWith(room);
    expect(socket.to).toHaveBeenCalledWith('ABCDEF');
    expect(socket.broadcastEmit).toHaveBeenCalledWith(
      ServerEvent.ParticipantLeft,
      { participantId: 'p-1' },
    );
    expect(socket.leave).toHaveBeenCalledWith('ABCDEF');
    expect(socket.data.roomCode).toBeUndefined();
    expect(socket.data.participantId).toBeUndefined();
  });

  it('silently returns when no roomCode on socket', async () => {
    const { socket } = setup();
    socket.data = {};

    const handler = socket._handlers.get(ClientEvent.RoomLeave)!;
    await handler();

    expect(mockGetRoom).not.toHaveBeenCalled();
  });
});
