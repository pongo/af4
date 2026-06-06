import { assert } from "smart-invariant";
import type {
  TaskList,
  UserAction,
  Task,
  PostponedTask,
  AdditionalStatus,
  ListType,
  CurrentList,
  CurrentListType,
} from "../types.ts";
import {
  completeTask,
  deleteAllDeletedTasks,
  findTask,
  markDeleteTask,
  markOldTasksAsDeleted,
  today,
  tomorrow,
} from "./utils.ts";

type Af4Env = {
  generateId: () => string;
  now: () => Date;
};

export function makeAf4(env: Af4Env) {
  return (tasklist: TaskList, action: UserAction): void => {
    reduceAf4(tasklist, action, env);
  };
}

function reduceAf4(tasklist: TaskList, action: UserAction, { generateId, now }: Af4Env): void {
  switch (action.type) {
    case "Next": {
      moveToNextList(tasklist);
      break;
    }

    case "Cleanup": {
      cleanup(tasklist, action.now);
      break;
    }

    default:
      applyTaskAction(tasklist, action);
  }

  function applyTaskAction(tasklist: TaskList, action: TaskAction) {
    switch (action.type) {
      case "AddTask": {
        tasklist.tasks.push(createNewTask(action.title));
        updateCurrentListStatus(tasklist);
        break;
      }

      case "ReaddTask": {
        const existingTask = findTask(tasklist, action.id);
        if (existingTask.status === "completed" && existingTask.additionalStatus === "readded") {
          break;
        }

        const title = action.title ?? existingTask.title;
        const newTaskList = getNewTaskListForAction(tasklist);
        markTaskActioned(tasklist, action.id, now(), changeCurrentList, "readded");
        tasklist.tasks.push(createNewTask(title, newTaskList));
        updateCurrentListStatus(tasklist);
        break;
      }

      case "CompleteTask": {
        markTaskActioned(tasklist, action.id, now(), changeCurrentList);
        updateCurrentListStatus(tasklist);
        break;
      }

      case "DeleteTask": {
        const task = findTask(tasklist, action.id);
        if (task.status !== "new") break;
        markDeleteTask(tasklist, action.id, now());
        tasklist.current.actionedCount++;
        updateCurrentListStatus(tasklist);
        break;
      }

      case "ZeroTask": {
        const task = findTask(tasklist, action.id);
        if (task.status !== "new") break;
        task.zero = !(task.zero ?? false);
        break;
      }

      case "AddPostponedTask": {
        tasklist.tasks.push(createPostponedTask(action.title, now()));
        updateCurrentListStatus(tasklist);
        break;
      }

      case "PostponeTask": {
        const task = findTask(tasklist, action.id);
        if (task.status === "completed" && task.additionalStatus === "postponed") {
          break;
        }

        const title = action.title ?? task.title;
        const newTaskList = getNewTaskListForAction(tasklist);
        markTaskActioned(tasklist, action.id, now(), changeCurrentList, "postponed");
        tasklist.tasks.push(createPostponedTask(title, now(), newTaskList));
        updateCurrentListStatus(tasklist);
        break;
      }
    }
  }

  function moveToNextList(tasklist: TaskList) {
    clearZero(tasklist);
    switch (tasklist.current.list) {
      case "open":
        cleanList(tasklist, now());
        changeCurrentList(tasklist, makeCurrent(tasklist, "closed"));
        break;
      case "closed":
        cleanList(tasklist, now());
        if (tasklist.tasks.some((t) => t.list === "review" && t.status === "new")) {
          changeCurrentList(tasklist, makeCurrent(tasklist, "review"));
          break;
        }
        if (tasklist.current.actionedCount === 0) {
          moveAllTasks(tasklist, "closed", "review");
        }
        changeCurrentList(tasklist, makeCurrent(tasklist, "open"));
        break;
      case "review":
        deleteAllTasks(tasklist, "review");
        changeCurrentList(
          tasklist,
          tasklist.tasks.some((t) => t.list === "closed" && t.status === "new")
            ? makeCurrent(tasklist, "closed")
            : makeCurrent(tasklist, "open"),
        );
        break;
      default:
        throw new Error("Should never happen");
    }
  }

  function cleanup(tasklist: TaskList, now: Date) {
    deleteAllDeletedTasks(tasklist);
    reviveDuePostponedTasks(tasklist, now);
    markOldTasksAsDeleted(tasklist, now);
    deleteAllDeletedTasks(tasklist);
  }

  function createNewTask(title: string, list: ListType = "open"): Task {
    return { id: generateId(), title, createdAt: now(), status: "new", list };
  }

  function createPostponedTask(title: string, nowDate: Date, list: ListType = "open"): Task {
    return {
      id: generateId(),
      title,
      createdAt: nowDate,
      status: "postponed",
      list,
      postponedUntil: nowDate.getHours() < 4 ? today(nowDate) : tomorrow(nowDate),
    };
  }

  function reviveDuePostponedTasks(tasklist: TaskList, now: Date) {
    const newTasks = tasklist.tasks
      .filter(
        (task): task is PostponedTask => task.status === "postponed" && task.postponedUntil <= now,
      )
      .map((task) => revivePostponedTask(task));

    if (newTasks.length > 0) {
      tasklist.tasks = tasklist.tasks.filter(
        (task) => !(task.status === "postponed" && task.postponedUntil <= now),
      );
      for (const newTask of newTasks) {
        tasklist.tasks.push(newTask);
      }
    }
  }

  function revivePostponedTask(task: PostponedTask): Task {
    return createNewTask(task.title, task.list);
  }

  function changeCurrentList(tasklist: TaskList, newCurrent: CurrentList) {
    tasklist.current = newCurrent;
    if (newCurrent.list === "open") {
      revealNextOpenPassTasks(tasklist);
      reviveDuePostponedTasks(tasklist, now());
    }
  }
}

type TaskAction = Exclude<UserAction, { type: "Next" } | { type: "Cleanup" }>;

function makeCurrent(tasklist: TaskList, list: CurrentListType): CurrentList {
  switch (list) {
    case "open":
      return deriveCurrentFlags(tasklist, {
        actionedCount: 0,
        list: "open",
        showNext: false,
      });
    case "closed":
      return deriveCurrentFlags(tasklist, {
        actionedCount: 0,
        list: "closed",
        showNext: false,
        willBeMarkedForReview: false,
      });
    case "review":
      return deriveCurrentFlags(tasklist, {
        actionedCount: 0,
        list: "review",
        showNext: true,
      });
    case "deleted":
      return deriveCurrentFlags(tasklist, {
        actionedCount: 0,
        list: "deleted",
        showNext: false,
      });
    default:
      throw new Error("Should never happen");
  }
}

function deriveCurrentFlags(tasklist: TaskList, current: CurrentList): CurrentList {
  switch (current.list) {
    case "open":
      return {
        ...current,
        showNext: tasklist.tasks.some((t) => t.list === "closed" && t.status === "new"),
      };
    case "closed":
      return {
        ...current,
        showNext: tasklist.tasks.some((t) => t.list === "open" && t.status === "new"),
        willBeMarkedForReview: current.actionedCount === 0,
      };
    case "review":
      return { ...current, showNext: true };
    case "deleted":
      return { ...current, showNext: false };
    default:
      throw new Error("Should never happen");
  }
}

function getNewTaskListForAction(tasklist: TaskList): ListType {
  return tasklist.current.list === "open" ? "open-new" : "open";
}

function markTaskActioned(
  tasklist: TaskList,
  id: string,
  actionedAt: Date,
  changeCurrentList: (tasklist: TaskList, current: CurrentList) => void,
  additionalStatus?: AdditionalStatus,
) {
  const task = findTask(tasklist, id);
  if (task.status !== "new") return;
  completeTask(tasklist, id, actionedAt, additionalStatus);
  tasklist.current.actionedCount++;
  if (shouldMoveOpenToClosed(tasklist)) {
    deleteAllTasks(tasklist, "closed");
    const newCurrent = makeCurrent(tasklist, "closed");
    newCurrent.restoreFocus = true;
    changeCurrentList(tasklist, newCurrent);
    moveAllTasks(tasklist, "open", "closed");
    tasklist.current.actionedCount++;
    updateCurrentListStatus(tasklist);
  }
}

function shouldMoveOpenToClosed(tasklist: TaskList): boolean {
  if (tasklist.current.list !== "open") return false;
  return !tasklist.tasks.some((t) => t.list === "closed" && t.status === "new");
}

function moveAllTasks(tasklist: TaskList, from: ListType, to: ListType) {
  assert(from !== to, `moveAllTasks: "from" should != "to": ${from}, ${to}`);
  tasklist.tasks.filter((t) => t.list === from).forEach((t) => void (t.list = to));
}

function clearZero(tasklist: TaskList) {
  tasklist.tasks.forEach((task) => {
    if (task.zero !== undefined) delete task.zero;
  });
}

function cleanList(tasklist: TaskList, now: Date) {
  markOldTasksAsDeleted(tasklist, now);
  deleteAllDeletedTasks(tasklist);
}

function updateCurrentListStatus(tasklist: TaskList) {
  tasklist.current = deriveCurrentFlags(tasklist, tasklist.current);
}

function revealNextOpenPassTasks(tasklist: TaskList) {
  tasklist.tasks.forEach((task) => {
    if (task.list === "open-new") task.list = "open";
  });
}

function deleteAllTasks(tasklist: TaskList, from: ListType) {
  tasklist.tasks = tasklist.tasks.filter((task) => task.list !== from);
}
