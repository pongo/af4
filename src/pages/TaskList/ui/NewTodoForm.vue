<script lang="ts">
export const newTodoFormFocused = ref(false);
</script>
<script setup lang="ts">
import { ref, onMounted, useTemplateRef } from "vue";
import { Plus, CalendarCheck } from "lucide-vue-next";

withDefaults(
  defineProps<{
    placeholder?: string;
  }>(),
  {
    placeholder: "Add a new task...",
  },
);

const emit = defineEmits<{
  (e: "add-todo", text: string, options: { postponed?: boolean }): void;
}>();

const newTodo = ref("");
const postponed = ref(false);
const inputRef = useTemplateRef("input");

const handleSubmit = () => {
  if (!newTodo.value.trim()) return;

  emit("add-todo", newTodo.value, { postponed: postponed.value });
  newTodo.value = "";
  reset();
  inputRef.value?.focus();
};

onMounted(() => {
  // inputRef.value?.focus();
});

function focusWithText(text: string, options: { postponed?: boolean } = {}) {
  newTodo.value = text;
  postponed.value = options.postponed ?? false;
  inputRef.value?.focus();
}

function reset() {
  postponed.value = false;
}

function focus() {
  inputRef.value?.focus();
}

defineExpose({ focusWithText, focus });
</script>

<template>
  <div class="flex gap-2">
    <input
      ref="input"
      type="text"
      v-model="newTodo"
      @keyup.enter="handleSubmit"
      @keyup.esc="reset"
      :placeholder="placeholder"
      class="flex-1 rounded-md border border-neutral-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-neutral-500 focus:outline-none"
      @focus="newTodoFormFocused = true"
      @blur="newTodoFormFocused = false"
    />
    <button
      @click="handleSubmit"
      class="rounded-md border border-neutral-300 bg-white px-4 py-2 text-neutral-500 transition-colors hover:bg-neutral-50 focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:outline-none active:text-red-500 active:ring-red-500"
      tabindex="-1"
    >
      <CalendarCheck v-if="postponed" />
      <Plus v-else class="h-5 w-5" />
    </button>
  </div>
</template>
