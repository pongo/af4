import { assert } from "smart-invariant";
import { computed, shallowRef } from "vue";
import { db, type TaskListLabel } from "@/app/db";

const taskListLabels = shallowRef<TaskListLabel[]>([]);
const taskListLabelsMap = computed(
  () => new Map(taskListLabels.value.map((list) => [list.id, list])),
);

let isLoaded = false;
let loadPromise: Promise<void> | null = null;
async function ensureLoaded() {
  if (isLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      taskListLabels.value = await db.getTaskListLabels();
      isLoaded = true;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

// Initial load
ensureLoaded();

export function useTaskListLabels() {
  return {
    taskListLabels,
    addTaskListLabel,
    removeTaskListLabel,
    getTaskListLabel,
    navigateToNextList,
    navigateListByIndex,
    ensureLoaded,
    reorderLabels,
    renameTaskListLabel,
  };
}

async function reorderLabels(orderedIds: string[]) {
  await db.reorderTaskListLabels(orderedIds);
  taskListLabels.value = await db.getTaskListLabels();
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

async function addTaskListLabel(name: string, id: string) {
  await db.addTaskListLabel(name, id);
  taskListLabels.value = await db.getTaskListLabels();
}

async function renameTaskListLabel(id: string, name: string) {
  await db.updateTaskListLabel(id, name);
  taskListLabels.value = await db.getTaskListLabels();
}

async function removeTaskListLabel(id: string) {
  await db.deleteTaskList(id);
  taskListLabels.value = await db.getTaskListLabels();
}

function getTaskListLabel(id: string) {
  return taskListLabelsMap.value.get(id);
}
