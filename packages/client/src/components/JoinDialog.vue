<template>
  <v-row justify="center" align="center">
    <v-col cols="12" sm="8" md="5" lg="4">
      <v-card class="pa-6" elevation="8">
        <v-card-title class="text-h5 text-center mb-4">
          Join Room {{ roomCode }}
        </v-card-title>

        <v-text-field
          v-model="name"
          label="Your Display Name"
          variant="outlined"
          :maxlength="30"
          autofocus
          @keyup.enter="join"
        />

        <v-btn
          block
          color="primary"
          size="large"
          class="mt-2"
          :disabled="!name.trim()"
          @click="join"
        >
          Join
        </v-btn>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '../stores/user';

const props = defineProps<{ roomCode: string }>();
const emit = defineEmits<{ joined: [] }>();

const userStore = useUserStore();
const name = ref(userStore.displayName);

function join() {
  if (!name.value.trim()) return;
  userStore.setDisplayName(name.value.trim());
  emit('joined');
}
</script>
