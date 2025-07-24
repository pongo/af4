import { computed, readonly, ref } from "vue";

export type TaskListLabel = {
  id: string;
  name: string;
};

const taskListLabels = ref<TaskListLabel[]>(load());
const taskListLabelsMap = computed(
  () => new Map(taskListLabels.value.map((list) => [list.id, list])),
);

export function useTaskListLabels() {
  return {
    taskListLabels: readonly(taskListLabels),
    addTaskListLabel,
    getTaskListLabel,
  };
}

function addTaskListLabel(name: string, id: string) {
  taskListLabels.value.push({ id, name });
  localStorage.setItem("af4-lists", JSON.stringify(taskListLabels.value));
}

function getTaskListLabel(id: string) {
  return taskListLabelsMap.value.get(id);
}

function load() {
  const lists = localStorage.getItem("af4-lists");
  if (lists == null) return [];
  return JSON.parse(lists) as TaskListLabel[];
}
