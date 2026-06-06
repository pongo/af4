import { assert } from "smart-invariant";
import { klona } from "klona";
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

interface Af4Env {
  generateId: () => string;
  now: () => Date;
}

export function makeAf4(env: Af4Env) {
  return (tasklist: TaskList, action: UserAction): void => {
    reduceAf4InPlace(tasklist, action, env);
  };
}

export function reduceAf4InPlace(tasklist: TaskList, action: UserAction, env: Af4Env): void {
  switch (action.type) {
    case "Next": {
      moveToNextList(env, tasklist);
      break;
    }

    case "Cleanup": {
      cleanup(env, tasklist, action.now);
      break;
    }

    default:
      applyTaskAction(env, tasklist, action);
  }
}

export function reduceAf4(tasklist: TaskList, action: UserAction, env: Af4Env): TaskList {
  const next = klona(tasklist);
  reduceAf4InPlace(next, action, env);
  return next;
}

type TaskAction = Exclude<UserAction, { type: "Next" } | { type: "Cleanup" }>;

function applyTaskAction(env: Af4Env, tasklist: TaskList, action: TaskAction) {
  const actionAt = env.now();

  switch (action.type) {
    case "AddTask": {
      tasklist.tasks.push(createNewTask(env, action.title, actionAt));
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
      markTaskActioned(env, tasklist, action.id, actionAt, "readded");
      tasklist.tasks.push(createNewTask(env, title, actionAt, newTaskList));
      updateCurrentListStatus(tasklist);
      break;
    }

    case "CompleteTask": {
      markTaskActioned(env, tasklist, action.id, actionAt);
      updateCurrentListStatus(tasklist);
      break;
    }

    case "DeleteTask": {
      const task = findTask(tasklist, action.id);
      if (task.status !== "new") break;
      markDeleteTask(tasklist, action.id, actionAt);
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
      tasklist.tasks.push(createPostponedTask(env, action.title, actionAt));
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
      markTaskActioned(env, tasklist, action.id, actionAt, "postponed");
      tasklist.tasks.push(createPostponedTask(env, title, actionAt, newTaskList));
      updateCurrentListStatus(tasklist);
      break;
    }
  }
}

function createNewTask(env: Af4Env, title: string, createdAt: Date, list: ListType = "open"): Task {
  return { id: env.generateId(), title, createdAt, status: "new", list };
}

function createPostponedTask(
  env: Af4Env,
  title: string,
  nowDate: Date,
  list: ListType = "open",
): Task {
  return {
    id: env.generateId(),
    title,
    createdAt: nowDate,
    status: "postponed",
    list,
    postponedUntil: nowDate.getHours() < 4 ? today(nowDate) : tomorrow(nowDate),
  };
}

function revivePostponedTask(env: Af4Env, task: PostponedTask, revivedAt: Date): Task {
  return createNewTask(env, task.title, revivedAt, task.list);
}

function cleanup(env: Af4Env, tasklist: TaskList, now: Date) {
  deleteAllDeletedTasks(tasklist);
  reviveDuePostponedTasks(env, tasklist, now);
  markOldTasksAsDeleted(tasklist, now);
  deleteAllDeletedTasks(tasklist);
}

function reviveDuePostponedTasks(env: Af4Env, tasklist: TaskList, now: Date) {
  const newTasks = tasklist.tasks
    .filter(
      (task): task is PostponedTask => task.status === "postponed" && task.postponedUntil <= now,
    )
    .map((task) => revivePostponedTask(env, task, now));

  if (newTasks.length > 0) {
    tasklist.tasks = tasklist.tasks.filter(
      (task) => !(task.status === "postponed" && task.postponedUntil <= now),
    );
    for (const newTask of newTasks) {
      tasklist.tasks.push(newTask);
    }
  }
}

function changeCurrentList(env: Af4Env, tasklist: TaskList, newCurrent: CurrentList) {
  tasklist.current = newCurrent;
  if (newCurrent.list === "open") {
    revealNextOpenPassTasks(tasklist);
    reviveDuePostponedTasks(env, tasklist, env.now());
  }
}

function moveToNextList(env: Af4Env, tasklist: TaskList) {
  clearZero(tasklist);
  switch (tasklist.current.list) {
    case "open":
      cleanList(tasklist, env.now());
      changeCurrentList(env, tasklist, makeCurrent(tasklist, "closed"));
      break;
    case "closed":
      cleanList(tasklist, env.now());
      if (tasklist.tasks.some((t) => t.list === "review" && t.status === "new")) {
        changeCurrentList(env, tasklist, makeCurrent(tasklist, "review"));
        break;
      }
      if (tasklist.current.actionedCount === 0) {
        moveAllTasks(tasklist, "closed", "review");
      }
      changeCurrentList(env, tasklist, makeCurrent(tasklist, "open"));
      break;
    case "review":
      deleteAllTasks(tasklist, "review");
      changeCurrentList(
        env,
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
  env: Af4Env,
  tasklist: TaskList,
  id: string,
  actionedAt: Date,
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
    changeCurrentList(env, tasklist, newCurrent);
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
