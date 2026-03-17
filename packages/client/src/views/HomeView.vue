<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="pa-6" elevation="8">
          <v-card-title class="text-h4 text-center mb-4">
            Planning Poker
          </v-card-title>

          <v-text-field
            v-model="displayName"
            label="Your Display Name"
            variant="outlined"
            :maxlength="30"
            class="mb-4"
            @keyup.enter="createRoom"
          />

          <v-btn
            block
            color="primary"
            size="large"
            class="mb-4"
            :disabled="!displayName.trim()"
            :loading="creating"
            @click="createRoom"
          >
            Create Room
          </v-btn>

          <v-divider class="mb-4" />

          <v-text-field
            v-model="roomCode"
            label="Room Code or Link"
            variant="outlined"
            class="mb-4"
            @input="parseRoomCode"
            @keyup.enter="joinRoom"
          />

          <v-btn
            block
            color="secondary"
            size="large"
            variant="outlined"
            :disabled="!displayName.trim() || roomCode.length < 6"
            :loading="joining"
            @click="joinRoom"
          >
            Join Room
          </v-btn>

          <v-alert v-if="error" type="error" class="mt-4" closable @click:close="error = ''">
            {{ error }}
          </v-alert>
        </v-card>
      </v-col>
    </v-row>

    <!-- Topic Dialog (shown before room creation) -->
    <v-dialog v-model="showTopicDialog" max-width="400">
      <v-card class="pa-4">
        <v-card-title>First Round Topic</v-card-title>
        <v-text-field
          v-model="initialTopic"
          label="Topic (optional)"
          variant="outlined"
          :maxlength="200"
          class="mt-2"
          @keyup.enter="confirmCreate"
        />
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showTopicDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="creating" @click="confirmCreate">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';

const router = useRouter();
const userStore = useUserStore();

const displayName = ref(userStore.displayName);
const roomCode = ref('');
const creating = ref(false);
const joining = ref(false);
const error = ref('');
const showTopicDialog = ref(false);
const initialTopic = ref('');

onMounted(() => {
  if (userStore.displayName) {
    displayName.value = userStore.displayName;
  }
});

function parseRoomCode() {
  const match = roomCode.value.match(/\/room\/([A-Z0-9]{6})\b/i);
  if (match) {
    roomCode.value = match[1].toUpperCase();
  } else {
    roomCode.value = roomCode.value.toUpperCase();
  }
}

function createRoom() {
  if (!displayName.value.trim()) return;
  initialTopic.value = '';
  showTopicDialog.value = true;
}

async function confirmCreate() {
  creating.value = true;
  error.value = '';

  try {
    userStore.setDisplayName(displayName.value.trim());

    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: displayName.value.trim(),
        topic: initialTopic.value.trim(),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create room');
    }

    const data = await res.json();
    userStore.setHostToken(data.roomCode, data.hostToken);
    userStore.setParticipantId(data.roomCode, data.participantId);
    showTopicDialog.value = false;
    router.push(`/room/${data.roomCode}`);
  } catch (err: any) {
    error.value = err.message;
  } finally {
    creating.value = false;
  }
}

async function joinRoom() {
  if (!displayName.value.trim() || roomCode.value.length < 6) return;
  joining.value = true;
  error.value = '';

  try {
    userStore.setDisplayName(displayName.value.trim());
    const code = roomCode.value.toUpperCase();

    const res = await fetch(`/api/rooms/${code}`);
    const data = await res.json();

    if (!data.exists) {
      throw new Error('Room not found');
    }

    router.push(`/room/${code}`);
  } catch (err: any) {
    error.value = err.message;
  } finally {
    joining.value = false;
  }
}
</script>
