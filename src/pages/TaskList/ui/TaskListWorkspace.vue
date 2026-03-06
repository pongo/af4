<script setup lang="ts">
import { ref, toRaw, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import type { TaskList } from "@/app/types";
import TaskListMain from "./TaskListMain.vue";
import { useDebouncedRefHistory } from "@vueuse/core";
import { klona } from "klona";
import { assert } from "smart-invariant";
import { db } from "@/app/db";
import hotkeys from "hotkeys-js";
import { createKeybindingsHandler } from "tinykeys";
import { useTaskListLabels } from "@/app/composables/useTaskListLabels.ts";

const props = defineProps<{
  initialData: TaskList;
}>();

const { navigateListLabel } = useTaskListLabels();
const router = useRouter();

// We clone the initial data to make it reactive and independent
const state = ref<TaskList>(klona(props.initialData));
const id = props.initialData.id;

const stateHistory = useDebouncedRefHistory(state, {
  capacity: 10,
  deep: true,
  clone: klona,
  debounce: 100,
});

const tinykeysHandler = createKeybindingsHandler({
  "Alt+([0-9])": (event) => {
    event.preventDefault();
    event.stopPropagation();
    const num = parseInt(event.key, 10);
    const index = (num === 0 ? 10 : num) - 1;
    assert(index >= 0 && index <= 9);
    const nextId = navigateListLabel(id, { index });
    if (nextId === undefined) return;
    router.replace(`/tl/${nextId}`);
  },
});

onMounted(() => {
  window.addEventListener("keydown", tinykeysHandler);

  hotkeys("q,a", (event, handler): false => {
    const nextId = navigateListLabel(id, {
      direction: handler.key === "q" ? "up" : "down",
    });
    if (nextId !== undefined) {
      router.replace(`/tl/${nextId}`);
    }
    return false;
  });
});

onUnmounted(() => {
  window.removeEventListener("keydown", tinykeysHandler);
  hotkeys.unbind("q,a");
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
