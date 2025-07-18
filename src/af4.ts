import { assert } from "smart-invariant";
import type { TaskList, UserAction, TaskListAction, Task } from "./types.ts";

export function af4({ generateId, now }: { generateId: () => string; now: () => Date }) {
  return (tasklist: TaskList, action: UserAction): TaskListAction[] => {
    const result: TaskListAction[] = [];

    // for (const action of actions) {
    switch (action.type) {
      case "AddTask": {
        result.push({ type: "AddTask", task: createTask(action.title) });
        break;
      }
      case "ReaddTask": {
        result.push({ type: "ReaddTask", id: action.id });
        // result.push({ type: "MarkComplete", id: action.id });
        // const existingTask = findTask(tasklist, action.id);
        // assert(existingTask, `Task with id ${action.id} should exist`);
        // result.push({ type: "AddTask", task: createTask(existingTask.title) });
        break;
      }
      case "Next": {
        switch (tasklist.current.list) {
          case "open":
            result.push({ type: "ChangeCurrentList", newCurrent: "closed" });
            break;
          case "closed":
            if (tasklist.tasks.filter((task) => task.list === "review").length > 0) {
              result.push({ type: "ChangeCurrentList", newCurrent: "review" });
              break;
            }

            if (tasklist.current.actionedCount > 0) {
              result.push({ type: "ChangeCurrentList", newCurrent: "open" });
            } else {
              result.push({ type: "ChangeCurrentList", newCurrent: "closed" });
              result.push({ type: "MoveAllTasks", from: "closed", to: "review" });
              result.push({ type: "MoveAllTasks", from: "open", to: "closed" });
            }
            break;
          case "review":
            result.push({ type: "MoveAllTasks", from: "review", to: "deleted" });
            result.push({ type: "ChangeCurrentList", newCurrent: "closed" });
            break;
          case "postponed":
            throw new Error("Should never happen");
          default:
            throw new Error("Should never happen");
        }
        break;
      }
      case "CompleteTask": {
        result.push({ type: "CompleteTask", id: action.id });
        break;
      }
      case "DeleteTask": {
        result.push({ type: "MarkDeleteTask", id: action.id });
        break;
      }
      case "ZeroTask": {
        result.push({ type: "ZeroTask", id: action.id });
        break;
      }
    }
    // }

    return result;
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
}

export function applyActions({ generateId, now }: { generateId: () => string; now: () => Date }) {
  return (tasklist: TaskList, actions: TaskListAction[]): void => {
    for (const action of actions) {
      switch (action.type) {
        case "AddTask": {
          tasklist.tasks.push(action.task);
          break;
        }
        case "ReaddTask": {
          const task = findAndComplete(action.id);
          tasklist.tasks.push(createTask(task.title));
          break;
        }
        case "ChangeCurrentList": {
          tasklist.current.list = action.newCurrent;
          tasklist.current.actionedCount = 0;
          break;
        }
        case "CompleteTask": {
          findAndComplete(action.id);
          break;
        }
        case "MoveAllTasks": {
          assert(
            action.from !== action.to,
            `MoveAllTasks: "from" should != "to": ${action.from}, ${action.to}`,
          );
          tasklist.tasks
            .filter((task) => task.list === action.from)
            .forEach((task) => void (task.list = action.to));
          break;
        }
        case "MarkDeleteTask": {
          const task = findTask(action.id);
          assert(task, `Task with id ${action.id} should exist`);
          task.status = "deleted";
          break;
        }
        case "ZeroTask": {
          const task = findTask(action.id);
          assert(task, `Task with id ${action.id} should exist`);
          if (task.status !== "new") break;
          task.zero = !(task?.zero ?? false);
          break;
        }
      }
    }

    function findTask(id: string): Task | undefined {
      return tasklist.tasks.find((task) => task.id === id);
    }

    function findAndComplete(id: string) {
      const task = findTask(id);
      assert(task, `Task with id ${id} should exist`);
      task.status = "completed";
      tasklist.current.actionedCount++;
      return task;
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
}

export function findTask(tasklist: TaskList, id: string): Task | undefined {
  // return (
  //   tasklist.parts.open.find((task) => task.id === id) ||
  //   tasklist.parts.closed.find((task) => task.id === id) ||
  //   tasklist.parts.review.find((task) => task.id === id) ||
  //   tasklist.parts.postponed.find((task) => task.id === id)
  // );
  return tasklist.tasks.find((task) => task.id === id);
}
