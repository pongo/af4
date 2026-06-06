import { nanoid } from "nanoid";
import { describe, expect, it } from "vitest";
import type { PostponedTask, TaskList } from "../types.ts";
import { makeAf4 } from "./af4.ts";
import { findTask } from "./utils.ts";

function createTaskList(): TaskList {
  return {
    id: nanoid(),
    tasks: [],
    current: {
      list: "open",
      actionedCount: 0,
      showNext: false,
    },
    system: "af4",
  };
}

function tasksCountByLists(tasklist: TaskList) {
  return {
    open: tasklist.tasks.filter((task) => task.list === "open").length,
    openNew: tasklist.tasks.filter((task) => task.list === "open-new").length,
    closed: tasklist.tasks.filter((task) => task.list === "closed").length,
    review: tasklist.tasks.filter((task) => task.list === "review").length,
    deleted: tasklist.tasks.filter((task) => task.list === "deleted").length,
  };
}

function tasksCountByStatuses(tasklist: TaskList) {
  return {
    new: tasklist.tasks.filter((task) => task.status === "new").length,
    completed: tasklist.tasks.filter((task) => task.status === "completed").length,
    postponed: tasklist.tasks.filter((task) => task.status === "postponed").length,
    deleted: tasklist.tasks.filter((task) => task.status === "deleted").length,
  };
}

describe("Postponed tasks", () => {
  it("should move postponed task to open when time comes", () => {
    const tasklist = createTaskList();
    const now = new Date("2025-01-01T18:59:39.584Z");
    makeAf4({ generateId: () => "postponed-task", now: () => now })(tasklist, {
      type: "AddPostponedTask",
      title: "Postponed Task",
    });
    expect(tasksCountByStatuses(tasklist)).toEqual({
      new: 0,
      completed: 0,
      postponed: 1,
      deleted: 0,
    });
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 1,
      openNew: 0,
      closed: 0,
      review: 0,
      deleted: 0,
    });

    // move time forward
    const postponedUntil = findTask<PostponedTask>(tasklist, "postponed-task").postponedUntil;
    const later = new Date(postponedUntil.getTime() + 1000);
    makeAf4({ generateId: () => "postponed-task", now: () => later })(tasklist, {
      type: "Cleanup",
      now: later,
    });
    expect(tasksCountByStatuses(tasklist)).toEqual({
      new: 1,
      completed: 0,
      postponed: 0,
      deleted: 0,
    });

    expect(findTask(tasklist, "postponed-task")).toEqual({
      id: "postponed-task",
      title: "Postponed Task",
      createdAt: later,
      status: "new",
      list: "open",
    });
  });

  it("postponed moves when have closed list tasks", () => {
    const tasklist = createTaskList();
    addTask("Open Task 1");
    addTask("Open Task 2");
    next(); // move to closed
    expect(tasklist.current.list).toBe("closed");
    addTask("Closed Task 1");
    addTask("Closed Task 2");

    addPostponedTask("Postponed Task", new Date("2025-01-01T18:59:39.584Z"));
    next(new Date("2025-01-01T19:00:00Z")); // move to open
    expect(tasklist.current.list).toBe("open");
    expect(tasksCountByStatuses(tasklist)).toEqual({
      completed: 0,
      deleted: 0,
      new: 4,
      postponed: 1,
    });
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 5,
      openNew: 0,
      closed: 0,
      review: 0,
      deleted: 0,
    });

    cleanup(new Date("2025-01-01T19:03:00Z"));
    expect(tasksCountByStatuses(tasklist)).toEqual({
      completed: 0,
      deleted: 0,
      new: 4,
      postponed: 1,
    });
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 5,
      openNew: 0,
      closed: 0,
      review: 0,
      deleted: 0,
    });

    // next day
    cleanup(new Date("2025-01-02T00:03:00Z"));
    expect(tasksCountByStatuses(tasklist)).toEqual({
      completed: 0,
      deleted: 0,
      new: 5,
      postponed: 0,
    });
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 5,
      openNew: 0,
      closed: 0,
      review: 0,
      deleted: 0,
    });

    // addPostponedTask("Postponed Task open list", new Date("2025-01-01T19:02:00Z"));
    // cleanup(new Date("2025-01-01T19:03:00Z"));
    // expect(tasksCountByStatuses(tasklist)).toEqual({
    //   new: 5,
    //   completed: 0,
    //   postponed: 1,
    //   deleted: 0,
    // });
    // expect(tasksCountByLists(tasklist)).toEqual({
    //   open: 6,
    //   openNew: 0,
    //   closed: 0,
    //   review: 0,
    //   deleted: 0,
    // });

    function addTask(id: string) {
      makeAf4({ generateId: () => id, now: () => new Date() })(tasklist, {
        type: "AddTask",
        title: id,
      });
    }

    function next(date: Date = new Date()) {
      makeAf4({ generateId: () => "", now: () => date })(tasklist, { type: "Next" });
    }

    function addPostponedTask(id: string, date: Date) {
      makeAf4({ generateId: () => id, now: () => date })(tasklist, {
        type: "AddPostponedTask",
        title: id,
      });
    }

    function cleanup(date: Date) {
      makeAf4({ generateId: () => "postponed-task", now: () => date })(tasklist, {
        type: "Cleanup",
        now: date,
      });
    }
  });
});
