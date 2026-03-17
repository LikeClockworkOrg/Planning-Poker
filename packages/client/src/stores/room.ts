import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  ClientEvent,
  ServerEvent,
  type ClientRoom,
  type RoundResult,
  type FibonacciValue,
} from '@planning-poker/shared';
import { getSocket } from '../socket';
import { useUserStore } from './user';

export const useRoomStore = defineStore('room', () => {
  const room = ref<ClientRoom | null>(null);
  const myParticipantId = ref<string | null>(null);
  const connected = ref(false);
  const lastResult = ref<RoundResult | null>(null);
  const lastError = ref<string | null>(null);
  const myVote = ref<FibonacciValue | null>(null);

  const isHost = computed(() => {
    if (!room.value || !myParticipantId.value) return false;
    const me = room.value.participants.find(
      (p) => p.id === myParticipantId.value,
    );
    return me?.isHost ?? false;
  });

  const myVoteSubmitted = computed(() => {
    if (!room.value || !myParticipantId.value) return false;
    return room.value.currentRound.votedParticipantIds.includes(
      myParticipantId.value,
    );
  });

  function handleError(message: string) {
    lastError.value = message;
  }

  function setupListeners() {
    const socket = getSocket();

    socket.on(ServerEvent.RoomState, (data) => {
      room.value = data.room;
      myParticipantId.value = data.participantId;
      connected.value = true;

      const userStore = useUserStore();
      userStore.setParticipantId(data.room.code, data.participantId);

      // Restore lastResult if current round is revealed
      if (data.room.currentRound.status === 'revealed' && data.room.currentRound.result) {
        lastResult.value = data.room.currentRound.result;
      }
    });

    socket.on(ServerEvent.ParticipantJoined, (data) => {
      if (!room.value) return;
      const exists = room.value.participants.find(
        (p) => p.id === data.participant.id,
      );
      if (!exists) {
        room.value.participants.push(data.participant);
      }
    });

    socket.on(ServerEvent.ParticipantLeft, (data) => {
      if (!room.value) return;
      room.value.participants = room.value.participants.filter(
        (p) => p.id !== data.participantId,
      );
    });

    socket.on(ServerEvent.VoteReceived, (data) => {
      if (!room.value) return;
      if (
        !room.value.currentRound.votedParticipantIds.includes(
          data.participantId,
        )
      ) {
        room.value.currentRound.votedParticipantIds.push(data.participantId);
      }
      const participant = room.value.participants.find(
        (p) => p.id === data.participantId,
      );
      if (participant) participant.hasVoted = true;
    });

    socket.on(ServerEvent.RoundRevealed, (data) => {
      if (!room.value) return;
      room.value.currentRound = data.round;
      lastResult.value = data.result;
    });

    socket.on(ServerEvent.RoundStarted, (data) => {
      if (!room.value) return;
      room.value.history = data.history;
      room.value.currentRound = data.round;
      lastResult.value = null;
      myVote.value = null;
      // Reset hasVoted on all participants
      for (const p of room.value.participants) {
        p.hasVoted = false;
      }
    });

    socket.on(ServerEvent.RoundTopicUpdated, (data) => {
      if (!room.value) return;
      room.value.currentRound.topic = data.topic;
    });

    socket.on(ServerEvent.Error, (data) => {
      handleError(data.message);
    });

    socket.on('connect', () => {
      // Reconnect to room if we were in one
      if (room.value && myParticipantId.value) {
        const userStore = useUserStore();
        socket.emit(ClientEvent.RoomJoin, {
          roomCode: room.value.code,
          displayName: userStore.displayName,
          participantId: myParticipantId.value,
          hostToken: userStore.getHostToken(room.value.code),
        });
      }
    });

    socket.on('disconnect', () => {
      connected.value = false;
    });
  }

  function joinRoom(roomCode: string) {
    const socket = getSocket();
    const userStore = useUserStore();

    if (!socket.connected) {
      setupListeners();
      socket.connect();
    }

    socket.emit(ClientEvent.RoomJoin, {
      roomCode,
      displayName: userStore.displayName,
      participantId: userStore.getParticipantId(roomCode),
      hostToken: userStore.getHostToken(roomCode),
    });
  }

  function submitVote(value: FibonacciValue) {
    const socket = getSocket();
    socket.emit(ClientEvent.VoteSubmit, { value });
    myVote.value = value;
  }

  function revealVotes() {
    const socket = getSocket();
    const userStore = useUserStore();
    if (!room.value) return;
    const hostToken = userStore.getHostToken(room.value.code);
    if (!hostToken) return;
    socket.emit(ClientEvent.RoundReveal, { hostToken });
  }

  function startNewRound(topic: string = '') {
    const socket = getSocket();
    const userStore = useUserStore();
    if (!room.value) return;
    const hostToken = userStore.getHostToken(room.value.code);
    if (!hostToken) return;
    socket.emit(ClientEvent.RoundNew, { hostToken, topic });
  }

  function setTopic(topic: string) {
    const socket = getSocket();
    const userStore = useUserStore();
    if (!room.value) return;
    const hostToken = userStore.getHostToken(room.value.code);
    if (!hostToken) return;
    socket.emit(ClientEvent.RoundSetTopic, { hostToken, topic });
  }

  function leaveRoom() {
    const socket = getSocket();
    socket.emit(ClientEvent.RoomLeave);
    socket.disconnect();
    room.value = null;
    myParticipantId.value = null;
    connected.value = false;
    lastResult.value = null;
  }

  return {
    room,
    myParticipantId,
    connected,
    lastResult,
    lastError,
    myVote,
    isHost,
    myVoteSubmitted,
    handleError,
    joinRoom,
    submitVote,
    revealVotes,
    startNewRound,
    setTopic,
    leaveRoom,
  };
});
