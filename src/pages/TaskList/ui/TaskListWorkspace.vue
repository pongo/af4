<script setup lang="ts">
import { ref, toRaw, watch } from "vue";
import type { TaskList } from "@/app/types";
import TaskListMain from "./TaskListMain.vue";
import { useDebouncedRefHistory } from "@vueuse/core";
import { klona } from "klona";
import { assert } from "smart-invariant";
import { db } from "@/app/db";

const props = defineProps<{
  initialData: TaskList;
}>();

// We clone the initial data to make it reactive and independent
const state = ref<TaskList>(klona(props.initialData));

const stateHistory = useDebouncedRefHistory(state, {
  capacity: 10,
  deep: true,
  clone: klona,
  debounce: 100,
});

watch(
  state,
  (newState) => {
    if (newState) {
      db.saveTaskList(toRaw(newState));
    }
  },
  { deep: true },
);

function undo(id: string) {
  if (!state.value || !stateHistory.last.value) return;
  assert(id === state.value.id);
  assert(id === (stateHistory.last.value.snapshot as TaskList).id);
  stateHistory.undo();
}

function redo(id: string) {
  if (!state.value || !stateHistory.last.value) return;
  assert(id === state.value.id);
  assert(id === (stateHistory.last.value.snapshot as TaskList).id);
  stateHistory.redo();
}
</script>

<template>
  <TaskListMain :state="state" @undo="undo" @redo="redo" />
</template>
