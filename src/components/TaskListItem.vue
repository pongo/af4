<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <div
    tabindex="0"
    class="p-2 hover:bg-neutral-100 focus:inset-ring-2 focus:inset-ring-neutral-500 focus:outline-none"
  >
    {{ title }}
  </div>
</template>
