<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import TaskListWatcher from "./TaskListWatcher/TaskListWatcher.vue";
import { useDBWatcher } from "./useDBWatcher";

const route = useRoute();
const id = computed(() => route.params.id as string);
useDBWatcher(id);

// Data is preloaded and cleaned up by the router's beforeEnter guard
const state = computed(() => route.meta.taskListData ?? null);
</script>

<template>
  <TaskListWatcher v-if="state" :key="id" :initial-data="state" />
</template>
