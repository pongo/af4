import { assert } from "smart-invariant";
import type {
  TaskList,
  UserAction,
  Task,
  AdditionalStatus,
  BaseCurrentList,
  ListType,
  CurrentList,
} from "../types.ts";
import {
  completeTask,
  DeleteAllDeletedTasks,
  findTask,
  markDeleteTask,
  markOldTasksAsDeleted,
  today,
  tomorrow,
} from "./utils.ts";

export function makeAf4({ generateId, now }: { generateId: () => string; now: () => Date }) {
  return (tasklist: TaskList, action: UserAction): void => {
    console.log("action", action);

    switch (action.type) {
      case "Next": {
        clearZero(tasklist);
        switch (tasklist.current.list) {
          case "open":
            cleanList(tasklist, now());
            changeCurrentList(tasklist, makeCurrent("closed"), now);
            break;
          case "closed":
            cleanList(tasklist, now());
            if (tasklist.tasks.some((t) => t.list === "review" && t.status === "new")) {
              changeCurrentList(tasklist, makeCurrent("review"), now);
              break;
            }
            if (tasklist.current.actionedCount === 0) {
              moveAllTasks(tasklist, "closed", "review");
            }
            changeCurrentList(tasklist, makeCurrent("open"), now);
            break;
          case "review":
            deleteAllTasks(tasklist, "review");
            changeCurrentList(
              tasklist,
              tasklist.tasks.some((t) => t.list === "closed" && t.status === "new")
                ? makeCurrent("closed")
                : makeCurrent("open"),
              now,
            );
            break;
          default:
            throw new Error("Should never happen");
        }
        break;
      }

      case "AddTask": {
        tasklist.tasks.push(createTask(action.title, tasklist));
        updateCurrentListStatus(tasklist);
        break;
      }

      case "ReaddTask": {
        const existingTask = findTask(tasklist, action.id);
        if (existingTask.status === "completed" && existingTask.additionalStatus === "readded") {
          break;
        }

        const title = action.title ?? existingTask.title;
        complete(action.id, "readded");
        tasklist.tasks.push(createTask(title, tasklist));
        updateCurrentListStatus(tasklist);
        break;
      }

      case "CompleteTask": {
        complete(action.id);
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
        complete(action.id, "postponed");
        tasklist.tasks.push(createPostponedTask(title, now()));
        updateCurrentListStatus(tasklist);
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
      tasklist.current.actionedCount++;
      if (shouldMoveOpenToClosed(tasklist)) {
        deleteAllTasks(tasklist, "closed");
        const newCurrent = makeCurrent("closed");
        newCurrent.restoreFocus = true;
        changeCurrentList(tasklist, newCurrent, now);
        moveAllTasks(tasklist, "open", "closed");
        tasklist.current.actionedCount++;
        updateCurrentListStatus(tasklist);
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
          return { ...base, list: "review", showNext: true };
        case "deleted":
          return { ...base, list: "deleted", showNext: false };
        default:
          throw new Error("Should never happen");
      }
    }
  };

  function createTask(title: string, _tasklist: TaskList): Task {
    // TODO: это точно нужно? как оно должно работать?
    // const list: ListType =
    // tasklist.current.list === "open" && tasklist.current.actionedCount > 0 ? "open-new" : "open";
    const list: ListType = "open";
    return { id: generateId(), title, createdAt: now(), status: "new", list };
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
        tasklist.tasks.push(createTask(newTask.title, tasklist));
      }
    }
  }

  function changeCurrentList(tasklist: TaskList, newCurrent: CurrentList, now: () => Date) {
    tasklist.current = newCurrent;
    if (newCurrent.list === "open") {
      CheckPostponedTasks(tasklist, now());
      moveNewTasksToOpen(tasklist);
    }
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
  DeleteAllDeletedTasks(tasklist);
}

function updateCurrentListStatus(tasklist: TaskList) {
  if (tasklist.current.list !== "closed") return;
  tasklist.current.showNext = tasklist.tasks.some((t) => t.list === "open" && t.status === "new");
  tasklist.current.willBeMarkedForReview = tasklist.current.actionedCount === 0;
}

function moveNewTasksToOpen(tasklist: TaskList) {
  tasklist.tasks.forEach((t) => {
    if (t.list === "open-new") t.list = "open";
  });
}

function deleteAllTasks(tasklist: TaskList, from: ListType) {
  tasklist.tasks = tasklist.tasks.filter((task) => task.list !== from);
}
