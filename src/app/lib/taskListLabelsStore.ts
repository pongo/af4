import { computed } from "vue";
import { db, taskListLabels } from "@/app/db";

const taskListLabelsMap = computed(
  () => new Map(taskListLabels.value.map((list) => [list.id, list])),
);

export function taskListLabelsStore() {
  return {
    taskListLabels,
    getTaskListLabel,
    navigateToNextList,
    navigateListByIndex,
    reorderLabels,
    renameTaskListLabel,
  };
}

async function reorderLabels(orderedIds: readonly string[]) {
  await db.reorderTaskListLabels(orderedIds);
}

function navigateToNextList(currentId: string, direction: "up" | "down"): string | undefined {
  const currentIndex = taskListLabels.value.findIndex((list) => list.id === currentId);
  if (currentIndex === -1) return;
  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= taskListLabels.value.length) return;
  return taskListLabels.value[nextIndex].id;
}

function navigateListByIndex(index: number): string | undefined {
  if (index < 0 || index >= taskListLabels.value.length) return;
  return taskListLabels.value[index].id;
}

async function renameTaskListLabel(id: string, name: string) {
  await db.updateTaskListLabel(id, name);
}

function getTaskListLabel(id: string) {
  return taskListLabelsMap.value.get(id);
}
