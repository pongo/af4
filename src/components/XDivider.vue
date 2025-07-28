<script setup lang="ts">
import { useSlots } from "vue";

defineProps<{ left?: boolean }>();

const slots = useSlots();
</script>

<template>
  <span class="flex items-center">
    <template v-if="slots.default">
      <span v-if="!left" class="h-px flex-1 bg-neutral-200" />
      <span class="shrink-0 text-neutral-400" :class="[left ? 'pe-4' : 'px-4']"><slot /></span>
      <span class="h-px flex-1 bg-neutral-200" />
    </template>
    <template v-else>
      <span class="h-px flex-1 bg-neutral-200" />
    </template>
  </span>
</template>
