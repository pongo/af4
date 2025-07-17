<script setup lang="ts">
import { ref, onMounted, useTemplateRef } from "vue";
import { Plus } from "lucide-vue-next";

withDefaults(
  defineProps<{
    placeholder?: string;
  }>(),
  {
    placeholder: "Add a new task...",
  },
);

const emit = defineEmits<{
  (e: "add-todo", text: string): void;
}>();

const newTodo = ref("");
const inputRef = useTemplateRef("input");

const handleSubmit = () => {
  if (!newTodo.value.trim()) return;

  emit("add-todo", newTodo.value);
  newTodo.value = "";
  inputRef.value?.focus();
};

onMounted(() => {
  // inputRef.value?.focus();
});
</script>

<template>
  <div class="flex gap-2 mb-6">
    <input
      ref="input"
      type="text"
      v-model="newTodo"
      @keypress.enter="handleSubmit"
      :placeholder="placeholder"
      class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <button
      @click="handleSubmit"
      class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      tabindex="-1"
    >
      <Plus class="w-5 h-5" />
    </button>
  </div>
</template>
