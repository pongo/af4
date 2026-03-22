<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import TaskListWatcher from "./TaskListWatcher/TaskListWatcher.vue";
import { useTaskListDbWatcher } from "./composables/useTaskListDbWatcher";

const route = useRoute();
const id = computed(() => route.params.id as string);

// Data is preloaded and cleaned up by the router's beforeEnter guard
const state = computed(() => route.meta.taskListData ?? null);

useTaskListDbWatcher(id);
</script>

<template>
  <TaskListWatcher v-if="state" :key="id" :initial-data="state" />
</template>
