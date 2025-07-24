<script setup lang="ts">
import type { TaskList } from "@/app/types";
import { useTaskListLabels } from "@/app/composables/useTaskListLabels";
import { nanoid } from "nanoid";
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";

const route = useRoute();
const router = useRouter();
const { addTaskListLabel } = useTaskListLabels();

const name = ref<string>("");

function add() {
  if (name.value.trim() === "") return;

  const id = ((route.params.id as string) ?? "").trim() || nanoid();
  const newState: TaskList = {
    id,
    tasks: [],
    current: {
      list: "open",
      actionedCount: 0,
      showNext: false,
    },
  };
  localStorage.setItem(`af4-${id}`, JSON.stringify(newState));
  addTaskListLabel(name.value, id);

  router.push(`/tl/${id}`);
}

function returnHome() {
  router.push("/tl");
}

const vFocus = {
  mounted(el: HTMLInputElement) {
    el.focus();
  },
};
</script>

<template>
  <form @submit.prevent="add" class="flex flex-col gap-2">
    <input
      type="text"
      placeholder="List name"
      v-model="name"
      v-focus
      required
      autocomplete="off"
      class="flex-1 rounded-md border border-neutral-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-neutral-500 focus:outline-none"
      @keyup.enter="add"
      @keyup.esc="returnHome"
    />
    <button
      type="submit"
      class="w-auto self-start rounded-md border border-neutral-300 bg-white px-4 py-2 text-neutral-500 hover:bg-neutral-50 active:text-red-500 active:ring-red-500"
    >
      Create
    </button>
  </form>
</template>

<style scoped></style>
