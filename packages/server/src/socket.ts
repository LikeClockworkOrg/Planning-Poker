import type { Server } from 'socket.io';
import {
  ClientEvent,
  ServerEvent,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_TOPIC_LENGTH,
  FIBONACCI_VALUES,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type FibonacciValue,
} from '@planning-poker/shared';
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
  calculateResult,
} from './room.js';

interface SocketData {
  roomCode: string;
  participantId: string;
}

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
): void {
  io.on('connection', (socket) => {
    socket.on(ClientEvent.RoomJoin, async (data) => {
      try {
        const { roomCode, displayName, participantId, hostToken } = data;

        if (
          !displayName ||
          displayName.trim().length === 0 ||
          displayName.trim().length > MAX_DISPLAY_NAME_LENGTH
        ) {
          socket.emit(ServerEvent.Error, { message: 'Invalid display name' });
          return;
        }

        const room = await getRoom(roomCode.toUpperCase());
        if (!room) {
          socket.emit(ServerEvent.Error, { message: 'Room not found' });
          return;
        }

        // Check if reconnecting with existing participant ID
        let existingParticipant = participantId
          ? room.participants.find((p) => p.id === participantId)
          : null;

        let myParticipantId: string;

        if (existingParticipant) {
          // Reconnecting — update display name
          existingParticipant.displayName = displayName.trim();
          myParticipantId = existingParticipant.id;

          // Restore host status if token matches
          if (hostToken && verifyHost(room, hostToken)) {
            existingParticipant.isHost = true;
          }
        } else {
          // Re-add with same ID if reconnecting after disconnect removed them
          const participant = addParticipant(room, displayName.trim(), participantId);
          myParticipantId = participant.id;

          // Check if this is the host reconnecting with a new socket
          if (hostToken && verifyHost(room, hostToken)) {
            participant.isHost = true;
          }

          // Broadcast to room before joining
          socket.to(room.code).emit(ServerEvent.ParticipantJoined, {
            participant,
          });
        }

        socket.data.roomCode = room.code;
        socket.data.participantId = myParticipantId;
        await socket.join(room.code);

        await saveRoom(room);

        socket.emit(ServerEvent.RoomState, {
          room: toClientRoom(room),
          participantId: myParticipantId,
        });
      } catch (err: any) {
        socket.emit(ServerEvent.Error, {
          message: err.message || 'Failed to join room',
        });
      }
    });

    socket.on(ClientEvent.VoteSubmit, async (data) => {
      try {
        const { roomCode, participantId } = socket.data;
        if (!roomCode || !participantId) return;

        if (!FIBONACCI_VALUES.includes(data.value as FibonacciValue)) {
          socket.emit(ServerEvent.Error, { message: 'Invalid vote value' });
          return;
        }

        const room = await getRoom(roomCode);
        if (!room) return;

        submitVote(room, participantId, data.value);
        await saveRoom(room);

        io.to(roomCode).emit(ServerEvent.VoteReceived, { participantId });
      } catch (err: any) {
        socket.emit(ServerEvent.Error, {
          message: err.message || 'Failed to submit vote',
        });
      }
    });

    socket.on(ClientEvent.RoundReveal, async (data) => {
      try {
        const { roomCode } = socket.data;
        if (!roomCode) return;

        const room = await getRoom(roomCode);
        if (!room) return;

        if (!verifyHost(room, data.hostToken)) {
          socket.emit(ServerEvent.Error, { message: 'Not authorized' });
          return;
        }

        const result = revealRound(room);
        await saveRoom(room);

        io.to(roomCode).emit(ServerEvent.RoundRevealed, {
          round: toClientRound(room.currentRound),
          result,
        });
      } catch (err: any) {
        socket.emit(ServerEvent.Error, {
          message: err.message || 'Failed to reveal round',
        });
      }
    });

    socket.on(ClientEvent.RoundNew, async (data) => {
      try {
        const { roomCode } = socket.data;
        if (!roomCode) return;

        const room = await getRoom(roomCode);
        if (!room) return;

        if (!verifyHost(room, data.hostToken)) {
          socket.emit(ServerEvent.Error, { message: 'Not authorized' });
          return;
        }

        const topic = data.topic?.trim().slice(0, MAX_TOPIC_LENGTH) || '';
        const newRound = startNewRound(room, topic);
        await saveRoom(room);

        io.to(roomCode).emit(ServerEvent.RoundStarted, {
          round: toClientRound(newRound),
          history: room.history.map(toClientRound),
        });
      } catch (err: any) {
        socket.emit(ServerEvent.Error, {
          message: err.message || 'Failed to start new round',
        });
      }
    });

    socket.on(ClientEvent.RoundSetTopic, async (data) => {
      try {
        const { roomCode } = socket.data;
        if (!roomCode) return;

        const room = await getRoom(roomCode);
        if (!room) return;

        if (!verifyHost(room, data.hostToken)) {
          socket.emit(ServerEvent.Error, { message: 'Not authorized' });
          return;
        }

        const topic = data.topic.trim().slice(0, MAX_TOPIC_LENGTH);
        room.currentRound.topic = topic;
        await saveRoom(room);

        io.to(roomCode).emit(ServerEvent.RoundTopicUpdated, { topic });
      } catch (err: any) {
        socket.emit(ServerEvent.Error, {
          message: err.message || 'Failed to update topic',
        });
      }
    });

    socket.on(ClientEvent.RoomLeave, async () => {
      try {
        const { roomCode, participantId } = socket.data;
        if (!roomCode || !participantId) return;

        const room = await getRoom(roomCode);
        if (!room) return;

        removeParticipant(room, participantId);
        await saveRoom(room);

        socket.to(roomCode).emit(ServerEvent.ParticipantLeft, {
          participantId,
        });

        socket.leave(roomCode);
        socket.data.roomCode = undefined as any;
        socket.data.participantId = undefined as any;
      } catch {
        // Ignore errors on leave
      }
    });
  });
}
