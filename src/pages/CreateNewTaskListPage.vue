<script setup lang="ts">
import type { SystemType, TaskList } from "@/app/types";
import { nanoid } from "nanoid";
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { db } from "@/app/db";

const route = useRoute();
const router = useRouter();

const system = ref<SystemType>("simple");
const name = ref<string>("");
const isSubmitting = ref(false);

async function add() {
  if (name.value.trim() === "" || isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    const id = ((route.params.id as string) || "").trim() || nanoid();
    const newState: TaskList = {
      id,
      tasks: [],
      current: {
        list: "open",
        actionedCount: 0,
        showNext: false,
      },
      system: system.value,
    };
    await db.addTaskList(name.value, newState);

    await router.push(`/tl/${id}`);
  } catch (e: unknown) {
    console.error("Failed to create task list:", e);
    alert("Failed to create task list: " + (e as Error).message);
    isSubmitting.value = false;
  }
}

function returnHome() {
  void router.push("/tl");
}

const vFocus = {
  mounted(el: HTMLInputElement) {
    el.focus();
  },
};
</script>

<template>
  <form class="flex flex-col gap-2" @submit.prevent="add">
    <input
      v-model="name"
      v-focus
      type="text"
      placeholder="List name"
      required
      autocomplete="off"
      class="flex-1 rounded-md border border-neutral-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-neutral-500 focus:outline-none"
      @keyup.esc="returnHome"
    />
    <div>
      <label for="system">
        <span class="mr-2 text-sm font-medium text-gray-700 select-none">List type</span>
        <select
          id="system"
          v-model="system"
          name="system"
          class="flex-1 rounded-md border border-neutral-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-neutral-500 focus:outline-none"
          required
        >
          <option value="">Please select</option>
          <option value="af4">AF4</option>
          <option value="simple">Simple</option>
        </select>
      </label>
    </div>
    <button
      type="submit"
      :disabled="isSubmitting"
      class="border-neutral-30 w-auto self-end rounded-md border bg-white px-4 py-2 text-neutral-500 shadow-sm hover:bg-neutral-50 active:text-red-500 active:ring-red-500 disabled:opacity-50"
    >
      {{ isSubmitting ? "Creating..." : "Create list" }}
    </button>
  </form>
</template>

<style scoped></style>
