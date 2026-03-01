import type { TaskList } from "@/app/types";

export type TaskListLabel = {
  id: string;
  name: string;
};

const LISTS_KEY = "af4-lists";
const TASK_LIST_PREFIX = "af4-";

const dateKeys = new Set(["createdAt", "postponedUntil", "completedAt", "deletedAt"]);

function parse<T>(data: string): T {
  return JSON.parse(data, (key, value) => {
    if (dateKeys.has(key)) {
      return new Date(value);
    }
    return value;
  });
}

export const db = {
  saveTaskList(taskList: TaskList): void {
    localStorage.setItem(`${TASK_LIST_PREFIX}${taskList.id}`, JSON.stringify(taskList));
  },

  getTaskList(id: string): TaskList {
    const savedState = localStorage.getItem(`${TASK_LIST_PREFIX}${id}`);
    if (!savedState) {
      throw new Error("No state found");
    }
    return parse<TaskList>(savedState);
  },

  saveTaskListLabels(labels: TaskListLabel[]): void {
    localStorage.setItem(LISTS_KEY, JSON.stringify(labels));
  },

  getTaskListLabels(): TaskListLabel[] {
    const lists = localStorage.getItem(LISTS_KEY);
    if (lists == null) return [];
    return JSON.parse(lists) as TaskListLabel[];
  },
};
