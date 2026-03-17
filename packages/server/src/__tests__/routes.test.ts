import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MAX_DISPLAY_NAME_LENGTH } from '@planning-poker/shared';
import { buildApp } from '../app.js';

vi.mock('../room.js', () => ({
  createRoom: vi.fn(),
  roomExists: vi.fn(),
  // Stubs for other exports that may be imported transitively
  hashToken: vi.fn(),
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
  calculateResult: vi.fn(),
}));

import { createRoom, roomExists } from '../room.js';

const mockCreateRoom = vi.mocked(createRoom);
const mockRoomExists = vi.mocked(roomExists);

describe('POST /api/rooms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a room with valid displayName', async () => {
    mockCreateRoom.mockResolvedValue({
      room: { code: 'ABCDEF' } as any,
      hostToken: 'token-123',
      participantId: 'p-1',
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { displayName: 'Alice' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.roomCode).toBe('ABCDEF');
    expect(body.hostToken).toBe('token-123');
    expect(body.participantId).toBe('p-1');
    expect(mockCreateRoom).toHaveBeenCalledWith('Alice', '');
  });

  it('passes trimmed topic through', async () => {
    mockCreateRoom.mockResolvedValue({
      room: { code: 'XYZXYZ' } as any,
      hostToken: 'tok',
      participantId: 'p-2',
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { displayName: 'Bob', topic: '  My Topic  ' },
    });

    expect(res.statusCode).toBe(201);
    expect(mockCreateRoom).toHaveBeenCalledWith('Bob', 'My Topic');
  });

  it('returns 400 for missing displayName', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Display name is required');
  });

  it('returns 400 for empty displayName', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { displayName: '' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Display name is required');
  });

  it('returns 400 for whitespace-only displayName', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { displayName: '   ' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Display name is required');
  });

  it('returns 400 for non-string displayName', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { displayName: 12345 },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Display name is required');
  });

  it('returns 400 for displayName exceeding MAX_DISPLAY_NAME_LENGTH', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { displayName: 'A'.repeat(MAX_DISPLAY_NAME_LENGTH + 1) },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Display name too long');
  });

  it('truncates topic to 200 chars', async () => {
    mockCreateRoom.mockResolvedValue({
      room: { code: 'AAAAAA' } as any,
      hostToken: 'tok',
      participantId: 'p-3',
    });

    const app = await buildApp();
    const longTopic = 'X'.repeat(300);
    const res = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { displayName: 'Charlie', topic: longTopic },
    });

    expect(res.statusCode).toBe(201);
    const calledTopic = mockCreateRoom.mock.calls[0][1];
    expect(calledTopic).toHaveLength(200);
  });
});

describe('GET /api/rooms/:code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns exists: true when room exists', async () => {
    mockRoomExists.mockResolvedValue(true);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/rooms/ABCDEF',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ exists: true });
    expect(mockRoomExists).toHaveBeenCalledWith('ABCDEF');
  });

  it('returns exists: false when room does not exist', async () => {
    mockRoomExists.mockResolvedValue(false);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/rooms/ZZZZZZ',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ exists: false });
  });

  it('uppercases room code before lookup', async () => {
    mockRoomExists.mockResolvedValue(true);

    const app = await buildApp();
    await app.inject({
      method: 'GET',
      url: '/api/rooms/abcdef',
    });

    expect(mockRoomExists).toHaveBeenCalledWith('ABCDEF');
  });
});
