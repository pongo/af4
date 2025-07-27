import { assert } from "smart-invariant";
import type { TaskList, UserAction, TaskListAction, Task, AdditionalStatus } from "../types.ts";

export function simple({ generateId, now }: { generateId: () => string; now: () => Date }) {
  return (tasklist: TaskList, action: UserAction): TaskListAction[] => {
    console.log("action", action);
    const result: TaskListAction[] = [];
    switch (action.type) {
      case "Next": {
        throw new Error("Not implemented");
      }
      case "AddTask": {
        result.push({ type: "AddTask", task: createTask(action.title) });
        break;
      }
      case "ReaddTask": {
        const existingTask = findTask(tasklist, action.id);

        if (existingTask.status === "completed" && existingTask.additionalStatus === "readded") {
          break;
        }

        complete(action.id, "readded");
        result.push({ type: "AddTask", task: createTask(existingTask.title) });
        break;
      }
      case "CompleteTask": {
        complete(action.id);
        break;
      }
      case "DeleteTask": {
        const task = findTask(tasklist, action.id);
        if (task.status !== "new") break;
        result.push({ type: "MarkDeleteTask", id: action.id, deletedAt: now() });
        break;
      }
      case "ZeroTask": {
        const task = findTask(tasklist, action.id);
        if (task.status !== "new") break;
        result.push({ type: "ZeroTask", id: action.id });
        break;
      }
      case "AddPostponedTask": {
        result.push({ type: "AddTask", task: createPostponedTask(action.title, now()) });
        break;
      }
      case "PostponeTask": {
        complete(action.id, "postponed");

        const task = findTask(tasklist, action.id);
        if (task.status === "completed" && task.additionalStatus === "postponed") {
          break;
        }

        result.push({ type: "AddTask", task: createPostponedTask(task.title, now()) });
        break;
      }
    }
    console.log("result", result);
    return result;

    function complete(id: string, additionalStatus?: AdditionalStatus) {
      const task = findTask(tasklist, id);
      if (task.status !== "new") return;
      result.push({ type: "CompleteTask", id, additionalStatus, completedAt: now() });
    }
  };

  function createTask(title: string): Task {
    return {
      id: generateId(),
      title,
      createdAt: now(),
      status: "new",
      list: "open",
    };
  }

  function createPostponedTask(title: string, now: Date): Task {
    return {
      id: generateId(),
      title,
      createdAt: now,
      status: "postponed",
      list: "open",
      postponedUntil: now.getHours() < 4 ? today(now) : tomorrow(now),
    };
  }
}

function today(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function tomorrow(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

export function findTask(tasklist: TaskList, id: string): Task {
  const task = tasklist.tasks.find((task) => task.id === id);
  assert(task, `Task with id ${id} should exist`);
  return task;
}
