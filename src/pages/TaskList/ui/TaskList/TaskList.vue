<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from "vue";
import TaskListItem from "./TaskListItem.vue";
import { useTaskListNavigation } from "./useTaskListNavigation.ts";
import type { ListType, TaskList } from "@/app/types.ts";
import TaskListHelp from "./TaskListHelp.vue";
import MyKbd from "@/components/MyKbd.vue";
import NextButton from "./NextButton.vue";
import { globalFocusedItem } from "@/app/lib/focusedItem.ts";

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

type TaskListItem = InstanceType<typeof TaskListItem>;
const taskItems = ref<TaskListItem[]>([]);
function setTaskItemRef(el: Element | ComponentPublicInstance | null, index: number) {
  if (el) {
    taskItems.value[index] = el as unknown as TaskListItem;
  } else {
    taskItems.value.splice(index, 1);
  }
}

const { focusedIndex, navigate } = useTaskListNavigation(currentTasks, taskItems);

const focusedTask = computed(() => {
  return currentTasks.value?.[focusedIndex.value];
});

const countByLists = computed(() => {
  return props.state.tasks.reduce(
    (acc, task) => {
      acc[task.list] = (acc[task.list] || 0) + 1;
      return acc;
    },
    {} as Record<ListType, number>,
  );
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
  nextTick(() => {
    const task = focusedTask.value;
    if (!task) return;
    if (task.id !== globalFocusedItem.value?.id) {
      console.log("!!!!", task, globalFocusedItem.value);
      globalFocusedItem.value = task;
    }
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
  getFocusedItem: (): TaskListItem | undefined => taskItems.value?.[focusedIndex.value],
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

  <div ref="container" class="relative flex flex-col">
    <TaskListItem
      v-for="(item, index) in currentTasks"
      :key="item.id"
      :state="item"
      :focused="focusedIndex === index"
      @focus="focusedIndex = index"
      :ref="(el) => setTaskItemRef(el, index)"
    />
    <div
      v-if="state.system !== 'simple'"
      class="absolute top-14 -right-20 -translate-y-1/2 -rotate-90 transform text-sm whitespace-nowrap text-neutral-400"
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
