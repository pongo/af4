import { ref } from "vue";

export type TaskListLabel = {
  id: string;
  name: string;
};

const taskListLabels = ref<TaskListLabel[]>(load());

export function useTaskListLabels() {
  return { taskListLabels, addTaskListLabel };
}

function addTaskListLabel(name: string, id: string) {
  taskListLabels.value.push({ id, name });
  localStorage.setItem("af4-lists", JSON.stringify(taskListLabels.value));
}

function load() {
  const lists = localStorage.getItem("af4-lists");
  if (lists == null) return [];
  return JSON.parse(lists) as TaskListLabel[];
}
