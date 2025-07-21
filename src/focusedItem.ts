import { ref } from "vue";
import type { Task } from "./types.ts";

export const globalFocusedItem = ref<Task | null>(null);
