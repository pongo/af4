<script setup lang="ts">
import MyKbd from "@/components/MyKbd.vue";
defineEmits<{ next: [] }>();
</script>

<template>
  <button
    @click="$emit('next')"
    class="relative ml-0 underline decoration-dashed underline-offset-4 transition-colors duration-300 hover:text-blue-500 hover:underline focus:no-underline"
  >
    Далее
  </button>
  <MyKbd class="ml-1">Shift</MyKbd><span class="mx-0.75">+</span><MyKbd>→</MyKbd>
</template>
