<script setup lang="ts">
import TaskListItem from "./TaskListItem.vue";

const props = defineProps<{ items: string[] }>();
</script>

<template>
  <div class="flex flex-col">
    <TaskListItem v-for="item in items" :key="item" :title="item" />
  </div>
</template>

<style scoped></style>
