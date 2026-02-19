<script lang="ts">
export const newTodoFormFocused = ref(false);
</script>
<script setup lang="ts">
import { ref, useTemplateRef } from "vue";
import { Plus, CalendarCheck } from "lucide-vue-next";
import { useShiftKey } from "./useShiftKey.ts";

withDefaults(
  defineProps<{
    placeholder?: string;
  }>(),
  {
    placeholder: "Add a new task...",
  },
);

const emit = defineEmits<{
  (e: "add-todo", text: string, options: { postponed?: boolean; origId?: string }): void;
  (e: "focus-task"): void;
}>();

const newTodo = ref("");
const postponed = ref(false);
const inputRef = useTemplateRef("input");
const origId = ref<string | undefined>(undefined);

const handleSubmit = (event?: KeyboardEvent | MouseEvent) => {
  if (!newTodo.value.trim()) return;

  emit("add-todo", newTodo.value, {
    postponed: event?.shiftKey || postponed.value,
    origId: origId.value,
  });
  reset();
  inputRef.value?.focus();
};

function focusWithText(text: string, options: { postponed?: boolean; origId?: string } = {}) {
  newTodo.value = text;
  postponed.value = options.postponed ?? false;
  origId.value = options.origId;
  inputRef.value?.focus();
}

function reset() {
  newTodo.value = "";
  postponed.value = false;
  origId.value = undefined;
}

function focus() {
  inputRef.value?.focus();
}

function focusTaskIfEmpty(event: KeyboardEvent) {
  if (newTodo.value.length > 0) return;
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

  event.preventDefault();
  event.stopPropagation();
  newTodo.value = "";
  // newTodoFormFocused.value = false;
  // inputRef.value?.blur();
  emit("focus-task");
}

defineExpose({ focusWithText, focus });

const { shiftKey } = useShiftKey(inputRef);
</script>

<template>
  <div class="flex gap-2">
    <input
      ref="input"
      type="text"
      v-model="newTodo"
      @keyup.enter="handleSubmit"
      @keyup.esc="reset"
      @keydown.space="focusTaskIfEmpty"
      :placeholder="newTodoFormFocused ? 'Press <space> to return to the task' : placeholder"
      class="flex-1 rounded-md border border-neutral-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-neutral-500 focus:outline-none"
      @focus="newTodoFormFocused = true"
      @blur="newTodoFormFocused = false"
    />
    <button
      @click="handleSubmit"
      class="rounded-md border border-neutral-300 bg-white px-4 py-2 text-neutral-500 transition-colors hover:bg-neutral-50 focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:outline-none active:text-red-500 active:ring-red-500"
      tabindex="-1"
    >
      <CalendarCheck v-if="postponed || shiftKey" class="h-5 w-5" />
      <Plus v-else class="h-5 w-5" />
    </button>
  </div>
</template>
