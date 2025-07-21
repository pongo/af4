<script setup lang="ts">
import type { Task } from "@/types.ts";
import {
  Binary,
  CalendarCheck,
  Check,
  CheckCheck,
  CheckCheckIcon,
  CheckCircle,
  CheckCircle2,
  CheckIcon,
  CheckLine,
  Circle,
  CircleSlash2,
  SquareCheck,
  SquareCheckBig,
  Zap,
} from "lucide-vue-next";
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";
import MyKbd from "./MyKbd.vue";
import { newTodoFormFocused } from "./NewTodoForm.vue";
import { itemIconPosToggle } from "@/toggles.ts";
import { globalFocusedItem } from "@/focusedItem.ts";

const itemRef = useTemplateRef("item");

const props = defineProps<{ state: Task; focused: boolean }>();

defineEmits<{ focus: [] }>();

const vFocus = {
  mounted: (el: HTMLElement, binding: { value: boolean }) => {
    if (binding.value) {
      el.focus();
    }
  },
  updated: (el: HTMLElement, binding: { value: boolean; oldValue: boolean }) => {
    if (binding.value && binding.value !== binding.oldValue) {
      el.focus();
    }
  },
};

// watch(
//   () => props.focused,
//   (value) => {
//     if (value) {
//       itemRef.value?.focus();
//     }
//   },
// );
//
// onMounted(() => {
//   if (props.focused) {
//     itemRef.value?.focus();
//   }
// });

const focusedWithoutFocus = computed(() => props.focused && newTodoFormFocused.value);
const wasFocused = ref(false);

watch(
  () => props.focused,
  (value) => {
    if (value) {
      globalFocusedItem.value = props.state;
      wasFocused.value = true;
    }
  },
);

onMounted(() => {
  wasFocused.value = props.focused;
});

const canBeMarkedAsWasFocused = computed(() => {
  return props.state.list === "closed" || props.state.list === "open";
});
</script>

<template>
  <div
    ref="item"
    :data-id="state.id"
    :tabindex="focused ? 0 : -1"
    class="flex flex-row p-2 text-black hover:bg-neutral-100 focus:inset-ring-2 focus:inset-ring-neutral-500 focus:outline-none"
    :class="[
      focused ? 'inset-ring-2 inset-ring-neutral-200' : undefined,
      state.status === 'completed' ? 'text-neutral-400' : undefined,
      state.status === 'deleted'
        ? 'text-neutral-400 line-through decoration-red-300 decoration-2'
        : undefined,
      state.list === 'review' && state.status === 'new' ? 'bg-yellow-50' : undefined,
      canBeMarkedAsWasFocused ? (wasFocused ? undefined : 'bg-indigo-50') : undefined,
    ]"
    @click="
      $emit('focus');
      globalFocusedItem = props.state;
    "
    v-focus="focused"
  >
    <div>
      <div :class="itemIconPosToggle.currentValue.value === 'in' ? '' : '-ml-9'">
        <CheckCheck
          v-if="state.status === 'completed' && state.additionalStatus === 'readded'"
          class="mr-1"
        />
        <CalendarCheck
          v-else-if="state.status === 'completed' && state.additionalStatus === 'postponed'"
          class="mr-1"
        />
        <Check v-else-if="state.status === 'completed'" class="mr-1" />
        <Zap v-else-if="state.zero" class="mr-1 text-lime-500" />
      </div>
    </div>
    <span
      >{{ state.title }}
      <span v-if="focusedWithoutFocus" class="ml-0.5 text-neutral-400"><MyKbd>Tab</MyKbd> </span>
    </span>
  </div>
</template>
