<template>
  <div class="d-flex flex-wrap ga-3 justify-center">
    <v-card
      v-for="value in FIBONACCI_VALUES"
      :key="value"
      :color="selectedVote === value ? 'primary' : undefined"
      :variant="selectedVote === value ? 'elevated' : 'outlined'"
      :elevation="selectedVote === value ? 8 : 0"
      class="voting-card d-flex align-center justify-center cursor-pointer"
      :class="{ 'card-disabled': status === 'revealed', 'card-selected': selectedVote === value }"
      width="80"
      height="110"
      @click="vote(value)"
    >
      <span class="text-h4 font-weight-bold">{{ value }}</span>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { FIBONACCI_VALUES, type FibonacciValue } from '@planning-poker/shared';
import { useRoomStore } from '../stores/room';
import { computed } from 'vue';

const props = defineProps<{
  status: string;
  myVoteSubmitted: boolean;
}>();

const emit = defineEmits<{ vote: [value: FibonacciValue] }>();

const roomStore = useRoomStore();
const selectedVote = computed(() => roomStore.myVote);

function vote(value: FibonacciValue) {
  if (props.status === 'revealed') return;
  if (selectedVote.value === value) {
    return;
  }
  emit('vote', value);
}
</script>

<style scoped>
.voting-card {
  transition: transform 0.15s, box-shadow 0.15s;
}
.voting-card:hover:not(.card-disabled) {
  transform: translateY(-6px);
}
.card-selected {
  transform: translateY(-6px);
  border: 2px solid rgb(var(--v-theme-primary));
}
.card-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
