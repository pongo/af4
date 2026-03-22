<script setup lang="ts">
import { ref, watch } from "vue";
import type { TaskList } from "@/app/types.ts";
import TaskListMain from "./TaskListMain/TaskListMain.vue";
import { useDebouncedRefHistory } from "@vueuse/core";
import { klona } from "klona";
import { assert } from "smart-invariant";
import { db } from "@/app/db.ts";

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
  async (newState) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    assert(newState != null);
    try {
      await db.saveTaskList(klona(newState));
    } catch (e: unknown) {
      console.error("Failed to save task list: ", e);
      alert("Failed to save task list: " + (e as Error).message);
    }
  },
  { deep: true },
);

function undo(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  assert(state.value != null);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  assert(stateHistory.last.value != null);

  assert(id === state.value.id);
  assert(id === (stateHistory.last.value.snapshot as TaskList).id);
  stateHistory.undo();
}

function redo(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  assert(state.value != null);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  assert(stateHistory.last.value != null);

  assert(id === state.value.id);
  assert(id === (stateHistory.last.value.snapshot as TaskList).id);
  stateHistory.redo();
}
</script>

<template>
  <TaskListMain :state="state" @undo="undo" @redo="redo" />
</template>
