import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const displayName = ref(localStorage.getItem('pp_displayName') || '');
  const hostTokens = ref<Record<string, string>>(
    JSON.parse(localStorage.getItem('pp_hostTokens') || '{}'),
  );
  const participantIds = ref<Record<string, string>>(
    JSON.parse(localStorage.getItem('pp_participantIds') || '{}'),
  );

  function setDisplayName(name: string) {
    displayName.value = name;
    localStorage.setItem('pp_displayName', name);
  }

  function setHostToken(roomCode: string, token: string) {
    hostTokens.value[roomCode] = token;
    localStorage.setItem('pp_hostTokens', JSON.stringify(hostTokens.value));
  }

  function getHostToken(roomCode: string): string | undefined {
    return hostTokens.value[roomCode];
  }

  function setParticipantId(roomCode: string, id: string) {
    participantIds.value[roomCode] = id;
    localStorage.setItem(
      'pp_participantIds',
      JSON.stringify(participantIds.value),
    );
  }

  function getParticipantId(roomCode: string): string | undefined {
    return participantIds.value[roomCode];
  }

  return {
    displayName,
    hostTokens,
    participantIds,
    setDisplayName,
    setHostToken,
    getHostToken,
    setParticipantId,
    getParticipantId,
  };
});
