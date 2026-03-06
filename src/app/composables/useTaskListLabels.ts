import { assert } from "smart-invariant";
import { computed, readonly, ref } from "vue";
import { db, type TaskListLabel } from "@/app/db";

const taskListLabels = ref<TaskListLabel[]>([]);
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
    navigateListLabel,
    ensureLoaded,
    reorderLabels,
  };
}

async function reorderLabels(orderedIds: string[]) {
  await db.reorderTaskListLabels(orderedIds);
  taskListLabels.value = await db.getTaskListLabels();
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

async function addTaskListLabel(name: string, id: string) {
  await db.addTaskListLabel(name, id);
  taskListLabels.value = await db.getTaskListLabels();
}

async function removeTaskListLabel(id: string) {
  await db.deleteTaskList(id);
  taskListLabels.value = await db.getTaskListLabels();
}

function getTaskListLabel(id: string) {
  return taskListLabelsMap.value.get(id);
}
