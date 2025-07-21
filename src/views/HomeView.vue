<script setup lang="ts">
import { ref, watch } from "vue";
import type { TaskList } from "@/types.ts";
import { nanoid } from "nanoid";
import TaskListView from "./TaskListView.vue";
import { CheckPostponedTasks, DeleteAllDeletedTasks } from "@/af4.ts";

const state = ref<TaskList>(load());

watch(
  state,
  (newState) => {
    localStorage.setItem("af4-state", JSON.stringify(newState));
  },
  { deep: true },
);

function load() {
  const savedState = localStorage.getItem("af4-state");
  if (savedState) {
    const data = parse(savedState);
    // data.tasks = data.tasks.filter((task) => task.list !== "deleted");
    DeleteAllDeletedTasks(data);
    CheckPostponedTasks(data, new Date());
    return data;
  }

  return newState();
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

function newState(): TaskList {
  return {
    id: nanoid(),
    tasks: [],
    current: {
      list: "open",
      actionedCount: 0,
      showNext: false,
    },
  };
}
</script>

<template>
  <TaskListView :state="state" />
</template>
