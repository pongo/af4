import type { TaskList, UserAction, Task, AdditionalStatus } from "../types.ts";
import {
  completeTask,
  DeleteAllDeletedTasks,
  findTask,
  markDeleteTask,
  markOldTasksAsDeleted,
  today,
  tomorrow,
} from "./utils.ts";

export function simple({ generateId, now }: { generateId: () => string; now: () => Date }) {
  return (tasklist: TaskList, action: UserAction): void => {
    console.log("action", action);

    switch (action.type) {
      case "Next":
        throw new Error("Not implemented");

      case "AddTask":
        tasklist.tasks.push(createTask(action.title));
        break;

      case "ReaddTask": {
        const existingTask = findTask(tasklist, action.id);
        if (existingTask.status === "completed" && existingTask.additionalStatus === "readded")
          break;
        const title = action.title ?? existingTask.title;
        complete(action.id, "readded");
        tasklist.tasks.push(createTask(title));
        break;
      }

      case "CompleteTask":
        complete(action.id);
        break;

      case "DeleteTask": {
        const task = findTask(tasklist, action.id);
        if (task.status !== "new") break;
        markDeleteTask(tasklist, action.id, now());
        break;
      }

      case "ZeroTask": {
        const task = findTask(tasklist, action.id);
        if (task.status !== "new") break;
        task.zero = !(task.zero ?? false);
        break;
      }

      case "AddPostponedTask":
        tasklist.tasks.push(createPostponedTask(action.title, now()));
        break;

      case "PostponeTask": {
        const task = findTask(tasklist, action.id);
        if (task.status === "completed" && task.additionalStatus === "postponed") break;
        const title = action.title ?? task.title;
        complete(action.id, "postponed");
        tasklist.tasks.push(createPostponedTask(title, now()));
        break;
      }

      case "Cleanup": {
        DeleteAllDeletedTasks(tasklist);
        CheckPostponedTasks(tasklist, action.now);
        markOldTasksAsDeleted(tasklist, action.now);
        DeleteAllDeletedTasks(tasklist);
        break;
      }
    }

    function complete(id: string, additionalStatus?: AdditionalStatus) {
      const task = findTask(tasklist, id);
      if (task.status !== "new") return;
      completeTask(tasklist, id, now(), additionalStatus);
    }
  };

  function createTask(title: string): Task {
    return { id: generateId(), title, createdAt: now(), status: "new", list: "open" };
  }

  function createPostponedTask(title: string, nowDate: Date): Task {
    return {
      id: generateId(),
      title,
      createdAt: nowDate,
      status: "postponed",
      list: "open",
      postponedUntil: nowDate.getHours() < 4 ? today(nowDate) : tomorrow(nowDate),
    };
  }

  function CheckPostponedTasks(tasklist: TaskList, now: Date) {
    const newTasks: Task[] = tasklist.tasks
      .filter((task) => task.status === "postponed" && task.postponedUntil <= now)
      .map((task) => ({
        id: task.id,
        title: task.title,
        createdAt: now,
        status: "new",
        list: "open",
      }));

    if (newTasks.length > 0) {
      console.log(newTasks);
      tasklist.tasks = tasklist.tasks.filter(
        (task) => !(task.status === "postponed" && task.postponedUntil <= now),
      );
      for (const newTask of newTasks) {
        tasklist.tasks.push(createTask(newTask.title));
      }
    }
  }
}
