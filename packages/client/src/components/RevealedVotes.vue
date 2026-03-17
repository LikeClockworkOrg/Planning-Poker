<template>
  <v-card variant="outlined" class="pa-4">
    <v-card-title class="text-subtitle-1 mb-2">Results</v-card-title>

    <div v-if="result" class="d-flex ga-6 mb-4 flex-wrap">
      <div class="text-center">
        <div class="text-h5 font-weight-bold">{{ result.average }}</div>
        <div class="text-caption text-grey">Average</div>
      </div>
      <div class="text-center">
        <div class="text-h5 font-weight-bold">{{ result.median }}</div>
        <div class="text-caption text-grey">Median</div>
      </div>
      <div class="text-center">
        <div class="text-h5 font-weight-bold">
          {{ result.mode.join(', ') || '-' }}
        </div>
        <div class="text-caption text-grey">Mode</div>
      </div>
    </div>

    <div class="vote-bars">
      <div
        v-for="val in votedValues"
        :key="val"
        class="d-flex align-center ga-2 mb-1"
      >
        <span class="text-body-2" style="width: 30px; text-align: right">
          {{ val }}
        </span>
        <v-progress-linear
          :model-value="getPercentage(val)"
          color="primary"
          height="24"
          rounded
        >
          <template #default>
            <span v-if="getCount(val) > 0" class="text-caption text-white">
              {{ getCount(val) }}
            </span>
          </template>
        </v-progress-linear>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  FIBONACCI_VALUES,
  type ClientRound,
  type RoundResult,
  type FibonacciValue,
} from '@planning-poker/shared';

const props = defineProps<{
  round: ClientRound;
  result: RoundResult | null;
}>();

const votedValues = computed(() =>
  FIBONACCI_VALUES.filter((val) => getCount(val) > 0),
);

function getCount(value: FibonacciValue): number {
  return props.round.votes.filter((v) => v.value === value).length;
}

function getPercentage(value: FibonacciValue): number {
  if (props.round.votes.length === 0) return 0;
  return (getCount(value) / props.round.votes.length) * 100;
}
</script>
