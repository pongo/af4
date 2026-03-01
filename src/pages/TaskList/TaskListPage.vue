<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { TaskList, UserAction } from "@/app/types";
import TaskListView from "@/pages/TaskList/TaskListView.vue";
import { useDebouncedRefHistory } from "@vueuse/core";
import { klona } from "klona";
import { assert } from "smart-invariant";
import { af4 as makeAf4 } from "@/app/model/af4";
import { simple as makeSimple } from "@/app/model/simple";
import { nanoid } from "nanoid";
import { db } from "@/app/db";

const af4 = makeAf4({ generateId: nanoid, now: () => new Date() });
const simple = makeSimple({ generateId: nanoid, now: () => new Date() });

const route = useRoute();
const id = computed(() => route.params.id as string);
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
    db.saveTaskList(newState);
  },
  { deep: true },
);

function dispatch(state: TaskList, action: UserAction): void {
  if (state.system === undefined || state.system === "af4") {
    af4(state, action);
    return;
  }
  if (state.system === "simple") {
    simple(state, action);
    return;
  }
  throw new Error("Unknown system");
}

function load() {
  const data = db.getTaskList(id.value);
  // data.tasks = data.tasks.filter((task) => task.list !== "deleted");
  dispatch(data, { type: "Cleanup", now: new Date() });
  return data;
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
