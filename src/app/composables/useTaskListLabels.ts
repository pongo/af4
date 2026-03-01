import { assert } from "smart-invariant";
import { computed, readonly, ref } from "vue";
import { db, type TaskListLabel } from "@/app/db";

const taskListLabels = ref<TaskListLabel[]>(load());
const taskListLabelsMap = computed(
  () => new Map(taskListLabels.value.map((list) => [list.id, list])),
);

export function useTaskListLabels() {
  return {
    taskListLabels: readonly(taskListLabels),
    addTaskListLabel,
    getTaskListLabel,
    navigateListLabel,
  };
}

type NavigateListLabelOptions = {
  direction?: "up" | "down";
  index?: number;
};

function navigateListLabel(currentId: string, options: NavigateListLabelOptions) {
  assert(options.direction !== undefined || options.index !== undefined);

  if (options.direction !== undefined) {
    const currentIndex = taskListLabels.value.findIndex((list) => list.id === currentId);
    if (currentIndex === -1) return;
    const nextIndex = options.direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= taskListLabels.value.length) return;
    return taskListLabels.value[nextIndex].id;
  }

  if (options.index !== undefined) {
    if (options.index < 0 || options.index >= taskListLabels.value.length) return;
    return taskListLabels.value[options.index].id;
  }
}

function addTaskListLabel(name: string, id: string) {
  taskListLabels.value.push({ id, name });
  db.saveTaskListLabels(taskListLabels.value);
}

function getTaskListLabel(id: string) {
  return taskListLabelsMap.value.get(id);
}

function load() {
  return db.getTaskListLabels();
}
