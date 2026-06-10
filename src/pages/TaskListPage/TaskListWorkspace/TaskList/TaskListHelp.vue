<script setup lang="ts">
defineProps<{ sign?: string }>();
</script>

<template>
  <div class="flex gap-2 pb-4 select-none">
    <div v-if="sign">{{ sign }}</div>
    <div class="space-y-1 text-neutral-400">
      <slot />
    </div>
  </div>
</template>

<style scoped></style>
