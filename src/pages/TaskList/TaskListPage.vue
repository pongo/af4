<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { TaskList } from "@/app/types";
import { db } from "@/app/db";
import { dispatch } from "@/app/model/dispatch";
import TaskListWorkspace from "./ui/TaskListWorkspace.vue";

const route = useRoute();
const id = computed(() => route.params.id as string);

const state = ref<TaskList | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

async function load() {
  isLoading.value = true;
  error.value = null;
  try {
    const data = await db.getTaskList(id.value);
    // Initial cleanup of the data
    dispatch(data, { type: "Cleanup", now: new Date() });
    state.value = data;
  } catch (e) {
    console.error("Failed to load task list:", e);
    error.value = "Failed to load task list";
  } finally {
    isLoading.value = false;
  }
}

watch(id, () => load(), { immediate: true });
</script>

<template>
  <div v-if="isLoading" class="p-6 text-gray-500">Loading...</div>
  <div v-else-if="error" class="p-6 text-red-500">{{ error }}</div>
  <TaskListWorkspace v-else-if="state" :initial-data="state" :key="id" />
</template>
