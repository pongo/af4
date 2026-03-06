<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { TaskList } from "@/app/types";
import TaskListWorkspace from "./ui/TaskListWorkspace.vue";
import { db } from "@/app/db.ts";

const router = useRouter();
const route = useRoute();
const id = computed(() => route.params.id as string);

// Data is preloaded and cleaned up by the router's beforeEnter guard
const state = computed(() => (route.meta.taskListData as TaskList) || null);

watch(db.dbChangedData, () => {
  if (db.dbChangedData.value) {
    const data = db.dbChangedData.value;
    if (data.id === id.value) {
      if (data.type === "delete" && data.storeName === "tasklists_meta") {
        router.push("/");
      }
      if (data.type === "change" && data.storeName === "tasklists_data") {
        router.go(0);
      }
    }
  }
});
</script>

<template>
  <TaskListWorkspace v-if="state" :initial-data="state" :key="id" />
</template>
