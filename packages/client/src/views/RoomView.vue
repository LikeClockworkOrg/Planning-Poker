<template>
  <v-container v-if="!hasDisplayName" class="fill-height" fluid>
    <JoinDialog :room-code="roomCode" @joined="onJoined" />
  </v-container>

  <v-container v-else-if="roomStore.room" fluid class="pa-4">
    <TopicBar
      :topic="roomStore.room.currentRound.topic"
      :is-host="roomStore.isHost"
      :status="roomStore.room.currentRound.status"
      @update-topic="roomStore.setTopic"
    />

    <v-row class="mt-2">
      <v-col cols="12" md="8">
        <VotingCards
          :status="roomStore.room.currentRound.status"
          :my-vote-submitted="roomStore.myVoteSubmitted"
          @vote="roomStore.submitVote"
        />

        <div class="d-flex gap-2 mt-4" v-if="roomStore.isHost">
          <v-btn
            v-if="roomStore.room.currentRound.status === 'voting'"
            color="accent"
            size="large"
            :disabled="roomStore.room.currentRound.votedParticipantIds.length === 0"
            @click="roomStore.revealVotes()"
          >
            Reveal Votes
          </v-btn>
          <v-btn
            v-else
            color="primary"
            size="large"
            @click="showNewRound = true"
          >
            New Round
          </v-btn>
        </div>

        <RevealedVotes
          v-if="roomStore.room.currentRound.status === 'revealed'"
          :round="roomStore.room.currentRound"
          :result="roomStore.lastResult"
          class="mt-4"
        />
      </v-col>

      <v-col cols="12" md="4">
        <ParticipantList
          :participants="roomStore.room.participants"
          :current-round="roomStore.room.currentRound"
          :my-id="roomStore.myParticipantId"
        />
      </v-col>
    </v-row>

    <RoundHistory
      v-if="roomStore.room.history.length > 0"
      :history="roomStore.room.history"
      class="mt-6"
    />

    <!-- New Round Dialog -->
    <v-dialog v-model="showNewRound" max-width="400">
      <v-card class="pa-4">
        <v-card-title>Start New Round</v-card-title>
        <v-text-field
          v-model="newRoundTopic"
          label="Topic (optional)"
          variant="outlined"
          :maxlength="200"
          class="mt-2"
          @keyup.enter="startRound"
        />
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showNewRound = false">Cancel</v-btn>
          <v-btn color="primary" @click="startRound">Start</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>

  <v-container v-else class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="auto">
        <v-progress-circular indeterminate size="64" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRoomStore } from '../stores/room';
import { useUserStore } from '../stores/user';
import JoinDialog from '../components/JoinDialog.vue';
import TopicBar from '../components/TopicBar.vue';
import VotingCards from '../components/VotingCards.vue';
import ParticipantList from '../components/ParticipantList.vue';
import RevealedVotes from '../components/RevealedVotes.vue';
import RoundHistory from '../components/RoundHistory.vue';

const route = useRoute();
const router = useRouter();
const roomStore = useRoomStore();
const userStore = useUserStore();

const roomCode = computed(() => (route.params.code as string).toUpperCase());
const hasDisplayName = computed(() => !!userStore.displayName);
const showNewRound = ref(false);
const newRoundTopic = ref('');

async function checkAndJoin() {
  try {
    const res = await fetch(`/api/rooms/${roomCode.value}`);
    const data = await res.json();
    if (!data.exists) {
      roomStore.handleError('Room not found');
      router.push('/');
      return;
    }
    roomStore.joinRoom(roomCode.value);
  } catch {
    roomStore.handleError('Failed to check room');
    router.push('/');
  }
}

function onJoined() {
  checkAndJoin();
}

function startRound() {
  roomStore.startNewRound(newRoundTopic.value);
  newRoundTopic.value = '';
  showNewRound.value = false;
}

onMounted(() => {
  if (hasDisplayName.value) {
    checkAndJoin();
  }
});

onUnmounted(() => {
  roomStore.leaveRoom();
});
</script>
