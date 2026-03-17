<template>
  <v-card variant="outlined">
    <v-card-title class="text-subtitle-1">Participants</v-card-title>
    <v-list density="compact">
      <template
        v-for="(p, index) in participants"
        :key="p.id"
      >
      <v-divider v-if="index > 0" />
      <v-list-item
        :class="{ 'font-weight-bold': p.id === myId }"
      >
        <template #prepend>
          <v-icon v-if="p.isHost" color="amber" size="small" class="mr-2">
            mdi-crown
          </v-icon>
          <v-icon v-else size="small" class="mr-2">mdi-account</v-icon>
        </template>

        <v-list-item-title>
          {{ p.displayName }}
          <span v-if="p.id === myId" class="text-grey"> (you)</span>
        </v-list-item-title>

        <template #append>
          <template v-if="currentRound.status === 'voting'">
            <v-icon v-if="p.hasVoted" color="success" size="small">
              mdi-check-circle
            </v-icon>
            <v-icon v-else color="grey" size="small">
              mdi-circle-outline
            </v-icon>
          </template>
          <template v-else>
            <v-chip
              v-if="getVote(p.id)"
              size="small"
              color="primary"
              variant="tonal"
            >
              {{ getVote(p.id) }}
            </v-chip>
            <span v-else class="text-grey text-caption">no vote</span>
          </template>
        </template>
      </v-list-item>
      </template>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import type { Participant, ClientRound } from '@planning-poker/shared';

const props = defineProps<{
  participants: Participant[];
  currentRound: ClientRound;
  myId: string | null;
}>();

function getVote(participantId: string) {
  const vote = props.currentRound.votes.find(
    (v) => v.participantId === participantId,
  );
  return vote?.value;
}
</script>
