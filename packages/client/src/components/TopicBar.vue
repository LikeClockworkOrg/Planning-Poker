<template>
  <v-card variant="outlined" class="pa-3" style="border-left: 4px solid rgb(var(--v-theme-primary))">
    <div v-if="isHost && status === 'voting'" class="d-flex align-center ga-2">
      <v-text-field
        v-model="localTopic"
        label="Topic"
        variant="outlined"
        density="compact"
        :maxlength="200"
        hide-details
        append-inner-icon="mdi-pencil"
        @blur="saveTopic"
        @keyup.enter="saveTopic"
      />
    </div>
    <div v-else class="text-body-1">
      <strong>Topic:</strong>&nbsp;
      <span v-if="topic" v-html="linkifiedTopic" />
      <span v-else>No topic set</span>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const URL_RE = /(https?:\/\/[^\s<]+)/g;

const props = defineProps<{
  topic: string;
  isHost: boolean;
  status: string;
}>();

const emit = defineEmits<{ updateTopic: [topic: string] }>();

const localTopic = ref(props.topic);

const linkifiedTopic = computed(() => {
  const escaped = props.topic
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(
    URL_RE,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
  );
});

watch(
  () => props.topic,
  (val) => {
    localTopic.value = val;
  },
);

function saveTopic() {
  if (localTopic.value !== props.topic) {
    emit('updateTopic', localTopic.value);
  }
}
</script>
