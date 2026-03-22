<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import TaskListWorkspace from "./TaskListWorkspace/TaskListWorkspace.vue";
import { db } from "@/app/db.ts";
import { assert } from "smart-invariant";

const router = useRouter();
const route = useRoute();
const id = computed(() => route.params.id as string);

// Data is preloaded and cleaned up by the router's beforeEnter guard
const state = computed(() => route.meta.taskListData ?? null);

watch(db.dbChangedData, (data) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  assert(data != null);

  if (data.id === id.value) {
    if (data.type === "delete" && data.storeName === "tasklists_meta") {
      void router.push("/");
      return;
    }
    if (data.type === "change" && data.storeName === "tasklists_data") {
      router.go(0);
      return;
    }
  }
});
</script>

<template>
  <TaskListWorkspace v-if="state" :key="id" :initial-data="state" />
</template>
