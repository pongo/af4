<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import type { TaskList } from "@/app/types";
import TaskListWorkspace from "./ui/TaskListWorkspace.vue";

const route = useRoute();
const id = computed(() => route.params.id as string);

// Data is preloaded and cleaned up by the router's beforeEnter guard
const state = (route.meta.taskListData as TaskList) || null;
</script>

<template>
  <TaskListWorkspace v-if="state" :initial-data="state" :key="id" />
</template>
