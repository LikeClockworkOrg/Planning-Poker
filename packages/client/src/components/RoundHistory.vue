<template>
  <v-card variant="outlined">
    <v-card-title
      class="text-subtitle-1 d-flex align-center cursor-pointer"
      @click="collapsed = !collapsed"
    >
      Round History ({{ history.length }})
      <v-spacer />
      <v-icon>{{ collapsed ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
    </v-card-title>
    <v-expansion-panels v-show="!collapsed" variant="accordion">
      <v-expansion-panel v-for="(round, i) in history" :key="round.id">
        <v-expansion-panel-title>
          <div class="d-flex align-center ga-2">
            <span class="text-body-2 text-grey">
              #{{ history.length - i }}
            </span>
            <span v-if="round.topic">{{ round.topic }}</span>
            <v-chip
              v-if="round.result"
              size="x-small"
              color="primary"
              variant="tonal"
              class="ml-2"
            >
              avg: {{ round.result.average }}
            </v-chip>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div v-if="round.result" class="d-flex ga-4 mb-3">
            <div>
              <strong>Average:</strong> {{ round.result.average }}
            </div>
            <div>
              <strong>Median:</strong> {{ round.result.median }}
            </div>
            <div>
              <strong>Mode:</strong> {{ round.result.mode.join(', ') || '-' }}
            </div>
          </div>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Vote</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="vote in round.votes" :key="vote.participantId">
                <td>{{ vote.displayName }}</td>
                <td>{{ vote.value }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ClientRound } from '@planning-poker/shared';

defineProps<{ history: ClientRound[] }>();

const collapsed = ref(false);
</script>
