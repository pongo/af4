import { assert } from "smart-invariant";
import type { TaskList, Task, AdditionalStatus, CompletedTask, DeletedTask } from "../types.ts";

export function markDeleteTask(tasklist: TaskList, id: string, deletedAt: Date) {
  const task = findTask(tasklist, id);
  task.status = "deleted";
  if (task.zero) delete task.zero;
  (task as DeletedTask).deletedAt = deletedAt;
}

export function completeTask(
  tasklist: TaskList,
  id: string,
  completedAt: Date,
  additionalStatus?: AdditionalStatus,
) {
  const task = findTask(tasklist, id);
  task.status = "completed";
  if (task.zero) delete task.zero;
  (task as CompletedTask).completedAt = completedAt;
  (task as CompletedTask).additionalStatus = additionalStatus;
}

export function today(now: Readonly<Date>) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function tomorrow(now: Readonly<Date>) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function findTask<T extends Task>(tasklist: TaskList, id: string): T {
  const task = tasklist.tasks.find((t) => t.id === id);
  assert(task, `Task with id ${id} should exist`);
  return task as T;
}

export function deleteAllDeletedTasks(tasklist: TaskList) {
  tasklist.tasks = tasklist.tasks.filter((t) => t.list !== "deleted");
}

export function markOldTasksAsDeleted(tasklist: TaskList, now: Date) {
  const thresholdDate = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  tasklist.tasks.forEach((task) => {
    if (task.list !== tasklist.current.list) return;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (task.status === "completed" && task.completedAt === undefined) {
      task.completedAt = thresholdDate;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (task.status === "deleted" && task.deletedAt === undefined) {
      task.deletedAt = thresholdDate;
    }

    if (
      (task.status === "completed" && task.completedAt <= thresholdDate) ||
      (task.status === "deleted" && task.deletedAt <= thresholdDate)
    ) {
      task.list = "deleted";
    }
  });
}
