<script setup lang="ts">
import type { Task } from "@/app/types.ts";
import { Asterisk, CalendarCheck, Check, CheckCheck, Zap } from "lucide-vue-next";
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";
import MyKbd from "@/components/MyKbd.vue";
import { newTodoFormFocused } from "../NewTodoForm/NewTodoForm.vue";
import { tw } from "@/lib/tw.ts";
import Autolinker, { HtmlTag } from "autolinker";
import { YYYYMMDD } from "@/lib/YYYYMMDD.ts";
import XDivider from "@/components/XDivider.vue";
import { globalNow } from "@/app/lib/global-now.ts";

const itemRef = useTemplateRef("item");

const props = defineProps<{ state: Task; focused: boolean }>();

const ageDays = computed(() => {
  return Math.floor(
    (globalNow.value.getTime() - props.state.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
});

defineEmits<{ focus: [] }>();
defineExpose({ openFirstLink, edit, focus });

function focus() {
  itemRef.value?.focus();
}

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
      wasFocused.value = true;
    }
  },
);

onMounted(() => {
  wasFocused.value = props.focused;
});

// const canBeMarkedAsWasFocused = computed(() => {
//   return props.state.list === "closed" || props.state.list === "open";
// });

const isDivider = computed(() => {
  return props.state.title === "-";
});

const backgroundColor = computed(() => {
  if (isDivider.value) return undefined;
  if (props.state.list === "review") {
    return props.state.status === "new" ? tw`bg-purple-50` : undefined;
  }
  if (props.state.status !== "new") return undefined;

  // canBeMarkedAsWasFocused ? (wasFocused ? undefined : 'bg-indigo-50') : undefined,
  // if (canBeMarkedAsWasFocused.value && !wasFocused.value) {
  // return tw`bg-indigo-50`;
  // }
  if (ageDays.value > 7) {
    return tw`bg-red-300`;
  }
  if (ageDays.value > 2) {
    return tw`bg-yellow-50`;
  }
  return undefined;
});

const reImportant = /^([!*])/;
const isImportant = computed(() => {
  return reImportant.test(props.state.title);
});
const importantPrefix = computed(() => {
  return reImportant.exec(props.state.title)?.[1];
});

const reListPrefix = /^([^\s])[.)]/;
const listPrefix = computed(() => {
  const m = reListPrefix.exec(props.state.title);
  return m ? m[1] : null;
});

const cleanedTitle = computed(() => {
  if (isImportant.value) return props.state.title.replace(reImportant, "").trim();
  if (listPrefix.value !== null) return props.state.title.replace(reListPrefix, "").trim();
  return props.state.title;
});

function ellipsis(str: string, truncateLen: number, ellipsisChars = "&hellip;"): string {
  return str.length <= truncateLen
    ? str
    : str.substring(0, truncateLen - ellipsisChars.length) + ellipsisChars;
}

const titleWithLinks = computed(() => {
  const completed = props.state.status === "completed" ? "text-neutral-400" : "";
  return Autolinker.link(cleanedTitle.value, {
    phone: false,
    email: false,
    replaceFn(match) {
      return new HtmlTag({
        tagName: "a",
        attrs: {
          href: match.getAnchorHref(),
          target: "_blank",
          class: `my-link ${completed}`,
          tabindex: "-1",
        },
        innerHtml: ellipsis(match.getAnchorText(), 50),
      });
    },
  });
});

function openFirstLink() {
  const links = Autolinker.parse(props.state.title, {
    phone: false,
    email: false,
  });
  if (links.length === 0) return;
  const link = links[0];
  if (link.getType() !== "url") return;
  window.open(link.getAnchorHref(), "_blank");
}

function edit() {
  let newTitle = prompt("Edit task", props.state.title);
  if (newTitle === null) return;
  newTitle = newTitle.trim();
  if (newTitle === "" || newTitle === props.state.title) return;
  return newTitle;
}
</script>

<template>
  <div
    ref="item"
    v-focus="focused"
    :data-id="state.id"
    :tabindex="focused ? 0 : -1"
    class="flex min-h-10 flex-row justify-between p-2 pb-1.5 text-black hover:bg-neutral-100 focus:inset-ring-2 focus:inset-ring-neutral-500 focus:outline-none"
    :class="[
      backgroundColor,
      focused ? 'inset-ring-2 inset-ring-neutral-200' : undefined,
      state.status === 'completed' ? 'text-neutral-400' : undefined,
      state.status === 'deleted' ? 'text-neutral-400' : undefined,
    ]"
    @click="$emit('focus')"
  >
    <template v-if="isDivider">
      <XDivider
        class="w-full text-neutral-400"
        :class="[
          state.status === 'deleted' ? 'line-through decoration-red-300 decoration-2' : undefined,
        ]"
        >{{ YYYYMMDD(state.createdAt)
        }}<span v-if="focusedWithoutFocus" class="ml-2 text-neutral-400"
          ><MyKbd>Space</MyKbd></span
        ></XDivider
      >
    </template>
    <template v-else>
      <div>
        <div class="-ml-9 h-6">
          <CheckCheck
            v-if="state.status === 'completed' && state.additionalStatus === 'readded'"
            class="mr-1 inline-block"
          />
          <CalendarCheck
            v-else-if="state.status === 'completed' && state.additionalStatus === 'postponed'"
            class="relative top-[-2px] mr-1 inline-block"
          />
          <Check v-else-if="state.status === 'completed'" class="mr-1 inline-block" />
          <Zap v-else-if="state.zero" class="mr-1 inline-block text-lime-500" />
          <span v-else-if="isImportant" class="mr-1 text-red-500">
            <Asterisk class="inline-block" />
            <span class="text-transparent selection:text-transparent">{{
              importantPrefix ?? "*"
            }}</span>
          </span>
          <span
            v-else-if="listPrefix !== null"
            class="mr-1 inline-flex h-6 w-6 items-center justify-center text-base font-bold text-blue-500 uppercase"
            >{{ listPrefix }}</span
          >
        </div>
      </div>
      <div class="w-full">
        <!-- eslint-disable vue/no-v-html -->
        <span
          :class="[
            state.status === 'deleted'
              ? 'text-neutral-400 line-through decoration-red-300 decoration-2'
              : undefined,
          ]"
          v-html="titleWithLinks"
        />
        <!-- eslint-enable -->
        <span v-if="focusedWithoutFocus" class="ml-2 text-neutral-400"><MyKbd>Space</MyKbd> </span>
      </div>
      <div v-if="ageDays > 1" class="ml-0.5 text-neutral-400 select-none">{{ ageDays }}</div>
    </template>
  </div>
</template>
