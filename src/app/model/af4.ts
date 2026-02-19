import { assert } from "smart-invariant";
import type {
  TaskList,
  UserAction,
  TaskListAction,
  Task,
  AdditionalStatus,
  CompletedTask,
  BaseCurrentList,
  ListType,
  CurrentList,
  DeletedTask,
} from "../types.ts";

export function af4({ generateId, now }: { generateId: () => string; now: () => Date }) {
  return (tasklist: TaskList, action: UserAction): TaskListAction[] => {
    console.log("action", action);
    const result: TaskListAction[] = [];
    switch (action.type) {
      case "Next": {
        result.push({ type: "ClearZero" });
        switch (tasklist.current.list) {
          case "open":
            result.push({ type: "CleanList", list: "open" });
            result.push({ type: "ChangeCurrentList", newCurrent: makeCurrent("closed") });
            break;
          case "closed":
            result.push({ type: "CleanList", list: "closed" });
            if (
              tasklist.tasks.filter((task) => task.list === "review" && task.status === "new")
                .length > 0
            ) {
              result.push({ type: "ChangeCurrentList", newCurrent: makeCurrent("review") });
              break;
            }

            if (tasklist.current.actionedCount > 0) {
              // result.push({ type: "ChangeCurrentList", newCurrent: makeCurrent("open") });
            } else {
              result.push({ type: "MoveAllTasks", from: "closed", to: "review" });
              // result.push({ type: "ChangeCurrentList", newCurrent: makeCurrent("closed") });
              // result.push({ type: "MoveAllTasks", from: "open", to: "closed" });
            }
            result.push({ type: "ChangeCurrentList", newCurrent: makeCurrent("open") });
            break;
          case "review":
            result.push({ type: "DeleteAllTasks", from: "review" });
            if (
              tasklist.tasks.filter((task) => task.list === "closed" && task.status === "new")
                .length > 0
            ) {
              result.push({ type: "ChangeCurrentList", newCurrent: makeCurrent("closed") });
            } else {
              result.push({ type: "ChangeCurrentList", newCurrent: makeCurrent("open") });
            }
            break;
          default:
            throw new Error("Should never happen");
        }
        break;
      }
      case "AddTask": {
        result.push({ type: "AddTask", task: createTask(action.title, tasklist) });
        result.push({ type: "UpdateCurrentListStatus" });
        break;
      }
      case "ReaddTask": {
        const existingTask = findTask(tasklist, action.id);

        if (existingTask.status === "completed" && existingTask.additionalStatus === "readded") {
          break;
        }

        complete(action.id, "readded");
        result.push({
          type: "AddTask",
          task: createTask(action.title ?? existingTask.title, tasklist),
        });
        result.push({ type: "UpdateCurrentListStatus" });
        break;
      }
      case "CompleteTask": {
        complete(action.id);
        result.push({ type: "UpdateCurrentListStatus" });
        break;
      }
      case "DeleteTask": {
        const task = findTask(tasklist, action.id);
        if (task.status !== "new") break;
        result.push({ type: "MarkDeleteTask", id: action.id, deletedAt: now() });
        result.push({ type: "IncreaseActionedCount" });
        result.push({ type: "UpdateCurrentListStatus" });
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
        result.push({ type: "UpdateCurrentListStatus" });
        break;
      }
      case "PostponeTask": {
        complete(action.id, "postponed");

        const task = findTask(tasklist, action.id);
        if (task.status === "completed" && task.additionalStatus === "postponed") {
          break;
        }

        result.push({
          type: "AddTask",
          task: createPostponedTask(action.title ?? task.title, now()),
        });
        result.push({ type: "UpdateCurrentListStatus" });
        break;
      }
    }
    console.log("result", result);
    return result;

    function complete(id: string, additionalStatus?: AdditionalStatus) {
      const task = findTask(tasklist, id);
      if (task.status !== "new") return;
      result.push({ type: "CompleteTask", id, additionalStatus, completedAt: now() });
      result.push({ type: "IncreaseActionedCount" });
      if (shouldMoveOpenToClosed(tasklist)) {
        result.push({ type: "DeleteAllTasks", from: "closed" });
        const newCurrent = makeCurrent("closed");
        newCurrent.restoreFocus = true;
        result.push({ type: "ChangeCurrentList", newCurrent });
        result.push({ type: "MoveAllTasks", from: "open", to: "closed" });
        result.push({ type: "IncreaseActionedCount" });
        result.push({ type: "UpdateCurrentListStatus" });
      }
    }

    function makeCurrent(list: ListType): CurrentList {
      const base: BaseCurrentList = {
        actionedCount: 0,
        showNext: false,
      };
      switch (list) {
        case "open":
          return {
            actionedCount: 0,
            list: "open",
            showNext: tasklist.tasks.some((t) => t.list === "closed" && t.status === "new"),
          };
        case "closed":
          return {
            actionedCount: 0,
            list: "closed",
            showNext: tasklist.tasks.some((t) => t.list === "open" && t.status === "new"),
            willBeMarkedForReview: true,
          };
        case "review":
          return {
            ...base,
            list: "review",
            showNext: true,
          };
        case "deleted":
          return {
            ...base,
            list: "deleted",
            showNext: false,
          };
        default:
          throw new Error("Should never happen");
      }
    }
  };

  function shouldMoveOpenToClosed(tasklist: TaskList): boolean {
    if (tasklist.current.list !== "open") return false;
    if (tasklist.tasks.some((t) => t.list === "closed" && t.status === "new")) return false;
    return true;
  }

  function createTask(title: string, tasklist: TaskList): Task {
    const list: ListType =
      tasklist.current.list === "open" && tasklist.current.actionedCount > 0 ? "open-new" : "open";
    return {
      id: generateId(),
      title,
      createdAt: now(),
      status: "new",
      list,
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

export function applyActions({ generateId, now }: { generateId: () => string; now: () => Date }) {
  return (tasklist: TaskList, actions: (TaskListAction | undefined)[]): void => {
    for (const action of actions) {
      if (action === undefined) continue;
      switch (action.type) {
        case "AddTask": {
          tasklist.tasks.push(action.task);
          break;
        }
        // case "ReaddTask": {
        //   const task = findAndComplete(action.id);
        //   tasklist.tasks.push(createTask(task.title));
        //   break;
        // }
        case "ChangeCurrentList": {
          tasklist.current = action.newCurrent;
          if (action.newCurrent.list === "open") {
            CheckPostponedTasks(tasklist, now());
            moveNewTasksToOpen(tasklist);
          }
          break;
        }
        case "CheckPostponedTasks": {
          CheckPostponedTasks(tasklist, now());
          break;
        }
        case "CompleteTask": {
          const task = findTask(action.id);
          assert(task, `Task with id ${action.id} should exist`);
          task.status = "completed";
          if (task.zero) delete task.zero;
          (task as CompletedTask).completedAt = action.completedAt;
          (task as CompletedTask).additionalStatus = action.additionalStatus;
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
          task.status = "deleted";
          if (task.zero) delete task.zero;
          (task as DeletedTask).deletedAt = action.deletedAt;
          break;
        }
        case "ZeroTask": {
          const task = findTask(action.id);
          // if (task.status !== "new") break;
          task.zero = !(task?.zero ?? false);
          break;
        }
        case "IncreaseActionedCount": {
          tasklist.current.actionedCount++;
          break;
        }
        case "DeleteAllTasks": {
          tasklist.tasks = tasklist.tasks.filter((task) => task.list !== action.from);
          break;
        }
        case "DeleteAllDeletedTasks": {
          DeleteAllDeletedTasks(tasklist);
          break;
        }
        case "CleanList": {
          /* const yesterday = new Date(now().getTime() - 24 * 60 * 60 * 1000);
          const yesterdayMidnight = new Date(
            yesterday.getFullYear(),
            yesterday.getMonth(),
            yesterday.getDate(),
          ); */
          const thresholdDate = new Date(now().getTime() - 12 * 60 * 60 * 1000);

          tasklist.tasks.forEach((task) => {
            if (task.list !== action.list) return;

            if (task.status === "completed" && task.completedAt === undefined) {
              task.completedAt = thresholdDate;
            }
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
          DeleteAllDeletedTasks(tasklist);
          break;
        }
        case "UpdateCurrentListStatus": {
          switch (tasklist.current.list) {
            case "closed":
              tasklist.current.showNext = tasklist.tasks.some(
                (t) => t.list === "open" && t.status === "new",
              );
              tasklist.current.willBeMarkedForReview = tasklist.current.actionedCount === 0;
              break;
          }
          break;
        }
        case "ClearZero": {
          tasklist.tasks.forEach((task) => {
            if (task.zero !== undefined) delete task.zero;
          });
          break;
        }
        case "PatchTask": {
          const task = findTask(action.id);
          if (action.additionalStatus !== undefined) {
            assert(task.status === "completed", "Task should be completed");
            task.additionalStatus = action.additionalStatus;
          }
          break;
        }
      }
    }

    function findTask(id: string): Task {
      const task = tasklist.tasks.find((task) => task.id === id);
      assert(task, `Task with id ${id} should exist`);
      return task;
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

export function DeleteAllDeletedTasks(tasklist: TaskList) {
  tasklist.tasks = tasklist.tasks.filter((task) => task.list !== "deleted");
}

export function findTask(tasklist: TaskList, id: string): Task {
  const task = tasklist.tasks.find((task) => task.id === id);
  assert(task, `Task with id ${id} should exist`);
  return task;
}

export function CheckPostponedTasks(tasklist: TaskList, now: Date) {
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
    tasklist.tasks.push(...newTasks);
  }
}

function moveNewTasksToOpen(tasklist: TaskList) {
  tasklist.tasks.forEach((task) => {
    if (task.list === "open-new") {
      task.list = "open";
    }
  });
}
