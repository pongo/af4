import { computed, shallowRef } from "vue";
import { db, type TaskListLabel } from "@/app/db";

const taskListLabels = shallowRef<TaskListLabel[]>([]);
const taskListLabelsMap = computed(
  () => new Map(taskListLabels.value.map((list) => [list.id, list])),
);

// Subscribe to database changes
const changeChannel = new BroadcastChannel("af4-db-changes");
changeChannel.onmessage = (event) => {
  if (
    (event.data.type === "change" || event.data.type === "delete") &&
    event.data.storeName === "tasklists_meta"
  ) {
    updateTaskListLabels();
  }
};

export function useTaskListLabels() {
  return {
    taskListLabels,
    getTaskListLabel,
    navigateToNextList,
    navigateListByIndex,
    updateTaskListLabels,
    reorderLabels,
    renameTaskListLabel,
  };
}

async function reorderLabels(orderedIds: string[]) {
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

export async function updateTaskListLabels() {
  taskListLabels.value = await db.getTaskListLabels();
}
