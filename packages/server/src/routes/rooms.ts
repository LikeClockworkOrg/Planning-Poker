import type { FastifyInstance } from 'fastify';
import {
  MAX_DISPLAY_NAME_LENGTH,
  type CreateRoomRequest,
  type CreateRoomResponse,
  type RoomExistsResponse,
} from '@planning-poker/shared';
import { createRoom, roomExists } from '../room.js';

export async function roomRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: CreateRoomRequest; Reply: CreateRoomResponse }>(
    '/api/rooms',
    async (request, reply) => {
      const { displayName, topic } = request.body;

      if (
        !displayName ||
        typeof displayName !== 'string' ||
        displayName.trim().length === 0
      ) {
        return reply.status(400).send({ error: 'Display name is required' } as any);
      }
      if (displayName.trim().length > MAX_DISPLAY_NAME_LENGTH) {
        return reply
          .status(400)
          .send({ error: 'Display name too long' } as any);
      }

      const { room, hostToken, participantId } = await createRoom(
        displayName.trim(),
        typeof topic === 'string' ? topic.trim().slice(0, 200) : '',
      );
      return reply.status(201).send({
        roomCode: room.code,
        hostToken,
        participantId,
      });
    },
  );

  app.get<{ Params: { code: string }; Reply: RoomExistsResponse }>(
    '/api/rooms/:code',
    async (request, reply) => {
      const { code } = request.params;
      const exists = await roomExists(code.toUpperCase());
      return reply.send({ exists });
    },
  );
}
