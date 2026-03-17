<template>
  <v-app>
    <v-app-bar density="comfortable" color="primary" flat>
      <v-app-bar-title :class="{ 'd-none d-sm-block': roomStore.room }">
        <router-link to="/" class="text-white text-decoration-none font-weight-bold">
          Planning Poker
        </router-link>
      </v-app-bar-title>

      <template v-if="roomStore.room">
        <div class="d-flex align-center ga-2 ga-sm-3 ml-4 ml-sm-0">
          <span class="text-body-1 text-sm-h6 font-weight-bold" style="font-family: monospace">
            {{ roomStore.room.code }}
          </span>
          <v-btn
            icon="mdi-content-copy"
            size="small"
            variant="text"
            @click="copyLink"
          />
          <v-chip variant="tonal" size="small">
            <v-icon start size="small">mdi-account-group</v-icon>
            {{ roomStore.room.participants.length }}
          </v-chip>
        </div>

        <v-spacer />

        <v-btn
          variant="text"
          to="/"
          size="small"
          icon="mdi-exit-to-app"
          class="d-sm-none"
        />
        <v-btn
          variant="text"
          to="/"
          size="small"
          prepend-icon="mdi-exit-to-app"
          class="d-none d-sm-flex"
        >
          Leave
        </v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
    <v-snackbar v-model="showError" color="error" :timeout="4000">
      {{ errorMessage }}
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoomStore } from './stores/room';

const roomStore = useRoomStore();
const showError = ref(false);
const errorMessage = ref('');

function copyLink() {
  navigator.clipboard.writeText(window.location.href);
}

watch(() => roomStore.lastError, (error) => {
  if (error) {
    errorMessage.value = error;
    showError.value = true;
    roomStore.lastError = null;
  }
});
</script>
