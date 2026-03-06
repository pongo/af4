<script setup lang="ts">
import { computed, ref, toRaw, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import type { TaskList, UserAction } from "@/app/types";
import TaskListMain from "./ui/TaskListMain.vue";
import { useDebouncedRefHistory } from "@vueuse/core";
import { klona } from "klona";
import { assert } from "smart-invariant";
import { af4 as makeAf4 } from "@/app/model/af4";
import { simple as makeSimple } from "@/app/model/simple";
import { nanoid } from "nanoid";
import { db } from "@/app/db";
import hotkeys from "hotkeys-js";
import { createKeybindingsHandler } from "tinykeys";
import { onMounted, onUnmounted } from "vue";
import { useTaskListLabels } from "@/app/composables/useTaskListLabels.ts";

const { navigateListLabel } = useTaskListLabels();

const af4 = makeAf4({ generateId: nanoid, now: () => new Date() });
const simple = makeSimple({ generateId: nanoid, now: () => new Date() });

const route = useRoute();
const router = useRouter();
const id = computed(() => route.params.id as string);

const tinykeysHandler = createKeybindingsHandler({
  "Alt+([0-9])": (event) => {
    event.preventDefault();
    event.stopPropagation();
    const num = parseInt(event.key, 10);
    const index = (num === 0 ? 10 : num) - 1;
    assert(index >= 0 && index <= 9);
    const nextId = navigateListLabel(id.value, { index });
    if (nextId === undefined) return;
    router.replace(`/tl/${nextId}`);
  },
});

onMounted(() => {
  window.addEventListener("keydown", tinykeysHandler);

  hotkeys("q,a", (event, handler): false => {
    const nextId = navigateListLabel(id.value, {
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

const state = ref<TaskList | null>(null);
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

async function load() {
  try {
    const data = await db.getTaskList(id.value);
    dispatch(data, { type: "Cleanup", now: new Date() });
    state.value = data;
    stateHistory.clear();
  } catch (e) {
    console.error("Failed to load task list:", e);
    // Handle error, maybe redirect or show message
  }
}

// Initial load
load();

watch(id, () => {
  load();
});

function undo(id: string) {
  if (!state.value || !stateHistory.last.value) return;
  console.log(stateHistory.last.value.timestamp, stateHistory.last.value.snapshot);
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
  <TaskListMain v-if="state" :state="state" @undo="undo" @redo="redo" />
</template>
