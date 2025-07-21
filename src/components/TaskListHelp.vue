<script setup lang="ts">
defineProps<{ sign?: string }>();
</script>

<template>
  <div class="pb-4 flex gap-2 select-none">
    <div v-if="sign">{{ sign }}</div>
    <div class="text-neutral-400 space-y-1">
      <slot />
    </div>
  </div>
</template>

<style scoped></style>
