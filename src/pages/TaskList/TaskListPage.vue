<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { TaskList } from "@/app/types";
import { nanoid } from "nanoid";
import TaskListView from "@/pages/TaskList/TaskListView.vue";
import { applyActions } from "@/app/model/af4";
import { useDebouncedRefHistory } from "@vueuse/core";
import { klona } from "klona";
import { assert } from "smart-invariant";

const route = useRoute();
const id = computed(() => route.params.id as string);
const localStorageKey = computed(() => `af4-${id.value}`);
const state = ref<TaskList>(load());
const stateHistory = useDebouncedRefHistory(state, {
  capacity: 10,
  deep: true,
  clone: klona,
  debounce: 100,
});

watch(
  state,
  (newState) => {
    localStorage.setItem(localStorageKey.value, JSON.stringify(newState));
  },
  { deep: true },
);

function load() {
  const savedState = localStorage.getItem(localStorageKey.value);
  if (!savedState) {
    throw new Error("No state found");
  }

  const data: TaskList = parse(savedState);
  // data.tasks = data.tasks.filter((task) => task.list !== "deleted");
  applyActions({ generateId: nanoid, now: () => new Date() })(data, [
    { type: "DeleteAllDeletedTasks" },
    { type: "CheckPostponedTasks" },
    { type: "CleanList", list: data.current.list },
  ]);
  return data;
}

function parse(data: string): TaskList {
  const dateKeys = new Set(["createdAt", "postponedUntil", "completedAt", "deletedAt"]);
  return JSON.parse(data, (key, value) => {
    if (dateKeys.has(key)) {
      return new Date(value);
    }
    return value;
  }) as TaskList;
}

watch(
  () => route.params.id,
  () => {
    state.value = load();
    stateHistory.clear();
  },
  { immediate: true },
);

function undo(id: string) {
  console.log(stateHistory.last.value.timestamp, stateHistory.last.value.snapshot);
  assert(id === state.value.id);
  assert(id === (stateHistory.last.value.snapshot as TaskList).id);
  stateHistory.undo();
}

function redo(id: string) {
  assert(id === state.value.id);
  assert(id === (stateHistory.last.value.snapshot as TaskList).id);
  stateHistory.redo();
}
</script>

<template>
  <TaskListView :state="state" @undo="undo" @redo="redo" />
</template>
