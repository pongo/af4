<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from "vue";
import TaskListItem from "./TaskListItem.vue";
import { useTaskListNavigation } from "./useTaskListNavigation.ts";
import type { TaskList } from "@/app/types.ts";
import TaskListHelp from "./TaskListHelp.vue";
import MyKbd from "@/components/MyKbd.vue";
import NextButton from "./NextButton.vue";
import { assert } from "smart-invariant";
import { closedListStyleToggle } from "@/app/lib/toggles.ts";

const props = defineProps<{ state: TaskList }>();

const currentTasks = computed(() =>
  props.state.tasks.filter((task) => {
    if (task.list !== props.state.current.list) return false;
    if (task.status === "postponed") return false;
    if (task.title === "-" && (task.status === "deleted" || task.status === "completed")) {
      return false;
    }
    return true;
  }),
);

type TTaskListItem = InstanceType<typeof TaskListItem>;
const taskItems = ref<TTaskListItem[]>([]);
function setTaskItemRef(el: Element | ComponentPublicInstance | null, index: number) {
  if (el) {
    taskItems.value[index] = el as unknown as TTaskListItem;
  } else {
    taskItems.value.splice(index, 1);
  }
}

const { focusedIndex, navigate } = useTaskListNavigation(currentTasks, taskItems);

const focusedTask = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  assert(currentTasks.value != null);
  return currentTasks.value[focusedIndex.value];
});

const currentListName = computed(() => {
  switch (props.state.current.list) {
    case "open":
      return "Открытый список";
    case "closed":
      return "Закрытый список";
    case "review":
      return "Ревью";
    default:
      return props.state.current.list;
  }
});

watch(focusedIndex, () => {
  void nextTick(() => {
    const task = focusedTask.value;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    assert(task != undefined);
  });
});

watch(
  () => props.state.current.list,
  () => {
    if (!props.state.current.restoreFocus) {
      focusedIndex.value = 0;
    }
  },
);

defineEmits<{ next: [] }>();
defineExpose({
  navigate,
  getFocusedIndex: () => focusedIndex.value,
  getFocusedTask: () => focusedTask.value,
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  getFocusedItem: (): TTaskListItem | undefined => taskItems.value?.[focusedIndex.value],
});
</script>

<template>
  <!-- <div class="mb-2">{{ countByLists }} {{ state.current }}</div> -->
  <TaskListHelp v-if="state.tasks.length === 0">Добавьте свою первую задачу.</TaskListHelp>
  <TaskListHelp v-else-if="currentTasks.length > 1">
    <p style="display: none">
      Нажмите <MyKbd>Tab</MyKbd>, чтобы перейти к задачам. Используйте <MyKbd>↑</MyKbd
      ><MyKbd>w</MyKbd><MyKbd>j</MyKbd><MyKbd>PgUp</MyKbd> и <MyKbd>↓</MyKbd><MyKbd>s</MyKbd
      ><MyKbd>k</MyKbd><MyKbd>PgDn</MyKbd>.
    </p>
    <p>
      Просмотрите каждую задачу. Спросите себя: есть ли у меня сопротивление к этой задаче? Если
      нет, отметьте её клавишей <MyKbd>z</MyKbd>.
    </p>
  </TaskListHelp>

  <div
    ref="container"
    class="relative flex flex-col"
    :class="{
      'outline-2 outline-offset-2 outline-neutral-500 outline-dotted':
        state.current.list === 'closed' && closedListStyleToggle.currentValue.value === 'outline',
    }"
  >
    <TaskListItem
      v-for="(item, index) in currentTasks"
      :key="item.id"
      :ref="(el) => setTaskItemRef(el, index)"
      :state="item"
      :focused="focusedIndex === index"
      @focus="focusedIndex = index"
    />
    <div
      v-if="state.system !== 'simple'"
      class="absolute top-14 -right-20 -translate-y-1/2 -rotate-90 transform text-sm whitespace-nowrap text-neutral-400 select-none"
    >
      {{ currentListName }}
    </div>
  </div>

  <TaskListHelp v-if="props.state.current.showNext" class="mt-4">
    <template v-if="props.state.current.list === 'closed'">
      <p>Можете вернуться в начало списка <MyKbd>Home</MyKbd> и снова пройтись по задачам.</p>
      <p>
        <span v-if="props.state.current.willBeMarkedForReview" class="bg-yellow-100">
          Если нажмете <NextButton @next="$emit('next')" />, то задачи будут отмечены для ревью.
          Выполните хотя бы одну задачу, чтобы этого избежать.
        </span>
        <template v-else>
          Нажмите <NextButton @next="$emit('next')" />, чтобы перейти к открытому списку.
        </template>
      </p>
    </template>
    <template v-else-if="props.state.current.list === 'review'">
      Нажмите <NextButton @next="$emit('next')" />. Все неотмеченные задачи будут удалены.
    </template>
    <template v-else-if="props.state.current.list === 'open'">
      Нажмите <NextButton @next="$emit('next')" />, чтобы перейти к закрытому списку. По открытому
      списку достаточно пройтись один раз.
    </template>
  </TaskListHelp>
</template>
