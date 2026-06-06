import { nanoid } from "nanoid";
import { describe, expect, it } from "vitest";
import type {
  CompletedTask,
  CurrentList,
  DeletedTask,
  PostponedTask,
  Task,
  TaskList,
} from "../types.ts";
import { makeAf4 } from "./af4.ts";
import { findTask } from "./utils.ts";

const baseNow = new Date("2025-01-01T10:00:00.000Z");

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

function createTask(
  id: string,
  overrides: Partial<Task> & Pick<Task, "list"> = { list: "open" },
): Task {
  return {
    id,
    title: id,
    createdAt: baseNow,
    status: "new",
    ...overrides,
  } as Task;
}

function runAction(
  tasklist: TaskList,
  action: Parameters<ReturnType<typeof makeAf4>>[1],
  options: { id?: string; now?: Date } = {},
) {
  const date = options.now ?? baseNow;
  makeAf4({ generateId: () => options.id ?? `${action.type}-id`, now: () => date })(
    tasklist,
    action,
  );
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

describe("AF4 list transitions", () => {
  it("moves from open to closed and clears zero markers", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(createTask("open-task", { list: "open", zero: true }));

    runAction(tasklist, { type: "Next" });

    expect(tasklist.current).toStrictEqual({
      actionedCount: 0,
      list: "closed",
      showNext: true,
      willBeMarkedForReview: true,
    });
    expect(findTask(tasklist, "open-task").zero).toBeUndefined();
  });

  it("moves from closed to review when review has new tasks", () => {
    const tasklist = createTaskList();
    tasklist.current = {
      actionedCount: 1,
      list: "closed",
      showNext: false,
      willBeMarkedForReview: false,
    };
    tasklist.tasks.push(createTask("closed-task", { list: "closed" }));
    tasklist.tasks.push(createTask("review-task", { list: "review" }));

    runAction(tasklist, { type: "Next" });

    expect(tasklist.current).toStrictEqual({
      actionedCount: 0,
      list: "review",
      showNext: true,
    });
    expect(findTask(tasklist, "closed-task").list).toBe("closed");
  });

  it("moves untouched closed tasks to review before returning to open", () => {
    const tasklist = createTaskList();
    tasklist.current = {
      actionedCount: 0,
      list: "closed",
      showNext: false,
      willBeMarkedForReview: true,
    };
    tasklist.tasks.push(createTask("closed-task", { list: "closed" }));

    runAction(tasklist, { type: "Next" });

    expect(tasklist.current).toStrictEqual({
      actionedCount: 0,
      list: "open",
      showNext: false,
    });
    expect(findTask(tasklist, "closed-task").list).toBe("review");
  });

  it("returns from changed closed list to open without marking tasks for review", () => {
    const tasklist = createTaskList();
    tasklist.current = {
      actionedCount: 1,
      list: "closed",
      showNext: false,
      willBeMarkedForReview: false,
    };
    tasklist.tasks.push(createTask("closed-task", { list: "closed" }));

    runAction(tasklist, { type: "Next" });

    expect(tasklist.current).toStrictEqual({
      actionedCount: 0,
      list: "open",
      showNext: true,
    });
    expect(findTask(tasklist, "closed-task").list).toBe("closed");
  });

  it("deletes review tasks and moves to closed when closed tasks are waiting", () => {
    const tasklist = createTaskList();
    tasklist.current = { actionedCount: 0, list: "review", showNext: true };
    tasklist.tasks.push(createTask("review-task", { list: "review" }));
    tasklist.tasks.push(createTask("closed-task", { list: "closed" }));
    tasklist.tasks.push(createTask("open-task", { list: "open" }));

    runAction(tasklist, { type: "Next" });

    expect(tasklist.current).toStrictEqual({
      actionedCount: 0,
      list: "closed",
      showNext: true,
      willBeMarkedForReview: true,
    });
    expect(tasklist.tasks.map((task) => task.id)).not.toContain("review-task");
  });

  it("deletes review tasks and moves to open when no closed tasks are waiting", () => {
    const tasklist = createTaskList();
    tasklist.current = { actionedCount: 0, list: "review", showNext: true };
    tasklist.tasks.push(createTask("review-task", { list: "review" }));

    runAction(tasklist, { type: "Next" });

    expect(tasklist.current).toStrictEqual({
      actionedCount: 0,
      list: "open",
      showNext: false,
    });
    expect(tasklist.tasks).toHaveLength(0);
  });

  it("completing the last open cycle moves open tasks to closed and restores focus", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(createTask("open-task", { list: "open" }));

    runAction(tasklist, { type: "CompleteTask", id: "open-task" });

    expect(tasklist.current).toStrictEqual({
      actionedCount: 1,
      list: "closed",
      restoreFocus: true,
      showNext: false,
      willBeMarkedForReview: false,
    });
    expect(findTask<CompletedTask>(tasklist, "open-task")).toMatchObject({
      list: "closed",
      status: "completed",
    });
  });

  it("stages readded open tasks for the next open pass", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(createTask("target", { list: "open" }));

    runAction(tasklist, { type: "ReaddTask", id: "target" }, { id: "readded" });

    expect(findTask<CompletedTask>(tasklist, "target")).toMatchObject({
      status: "completed",
      additionalStatus: "readded",
    });
    expect(findTask(tasklist, "readded")).toMatchObject({
      status: "new",
      list: "open-new",
    });
  });

  it("stages postponed open tasks for the next open pass", () => {
    const tasklist = createTaskList();
    const now = new Date("2025-01-01T02:00:00.000Z");
    tasklist.tasks.push(createTask("target", { list: "open" }));

    runAction(tasklist, { type: "PostponeTask", id: "target" }, { id: "postponed", now });

    expect(findTask<CompletedTask>(tasklist, "target")).toMatchObject({
      status: "completed",
      additionalStatus: "postponed",
    });
    expect(findTask<PostponedTask>(tasklist, "postponed")).toMatchObject({
      status: "postponed",
      list: "open-new",
      postponedUntil: new Date(2025, 0, 2),
    });
  });

  it("reveals staged open tasks when returning to open", () => {
    const tasklist = createTaskList();
    tasklist.current = {
      actionedCount: 1,
      list: "closed",
      showNext: false,
      willBeMarkedForReview: false,
    };
    tasklist.tasks.push(createTask("staged", { list: "open-new" }));

    runAction(tasklist, { type: "Next" });

    expect(tasklist.current.list).toBe("open");
    expect(findTask(tasklist, "staged").list).toBe("open");
  });

  it("keeps due staged postponed tasks hidden until returning to open", () => {
    const tasklist = createTaskList();
    const dueDate = new Date("2025-01-02T00:01:00.000Z");
    tasklist.tasks.push(
      createTask("postponed", {
        list: "open-new",
        status: "postponed",
        postponedUntil: new Date("2025-01-02T00:00:00.000Z"),
      }),
    );

    runAction(tasklist, { type: "Cleanup", now: dueDate }, { id: "created", now: dueDate });

    expect(findTask(tasklist, "created")).toMatchObject({
      status: "new",
      list: "open-new",
    });

    tasklist.current = {
      actionedCount: 1,
      list: "closed",
      showNext: false,
      willBeMarkedForReview: false,
    };
    runAction(tasklist, { type: "Next" }, { now: dueDate });

    expect(tasklist.current.list).toBe("open");
    expect(findTask(tasklist, "created").list).toBe("open");
  });
});

describe("AF4 actions in current list variants", () => {
  for (const current of ["open", "closed", "review"] as const) {
    describe(`${current} list`, () => {
      it("adds ordinary tasks to open", () => {
        const tasklist = createTaskListForCurrent(current);

        runAction(tasklist, { type: "AddTask", title: "Added task" }, { id: `${current}-added` });

        expect(findTask(tasklist, `${current}-added`)).toMatchObject({
          title: "Added task",
          status: "new",
          list: "open",
        });
        if (current === "closed") {
          expect(tasklist.current.showNext).toBe(true);
          expect(tasklist.current.willBeMarkedForReview).toBe(true);
        }
      });

      it("adds postponed tasks to open", () => {
        const tasklist = createTaskListForCurrent(current);
        const now = new Date("2025-01-01T05:00:00.000Z");

        runAction(
          tasklist,
          { type: "AddPostponedTask", title: "Postponed task" },
          { id: `${current}-postponed`, now },
        );

        expect(findTask<PostponedTask>(tasklist, `${current}-postponed`)).toMatchObject({
          title: "Postponed task",
          status: "postponed",
          list: "open",
          postponedUntil: new Date(2025, 0, 2),
        });
        if (current === "closed") {
          expect(tasklist.current.showNext).toBe(false);
          expect(tasklist.current.willBeMarkedForReview).toBe(true);
        }
      });

      it("readds current tasks to open and marks original as completed", () => {
        const tasklist = createTaskListForCurrent(current);

        runAction(
          tasklist,
          { type: "ReaddTask", id: `${current}-target`, title: "Renamed task" },
          { id: `${current}-readded` },
        );

        expect(findTask<CompletedTask>(tasklist, `${current}-target`)).toMatchObject({
          status: "completed",
          additionalStatus: "readded",
        });
        expect(findTask(tasklist, `${current}-readded`)).toMatchObject({
          title: "Renamed task",
          status: "new",
          list: current === "open" ? "open-new" : "open",
        });
        expect(tasklist.current.actionedCount).toBe(1);
        if (current === "closed") {
          expect(tasklist.current.showNext).toBe(true);
          expect(tasklist.current.willBeMarkedForReview).toBe(false);
        }
      });

      it("postpones current tasks to open and marks original as completed", () => {
        const tasklist = createTaskListForCurrent(current);
        const now = new Date("2025-01-01T02:00:00.000Z");

        runAction(
          tasklist,
          { type: "PostponeTask", id: `${current}-target`, title: "Later task" },
          { id: `${current}-later`, now },
        );

        expect(findTask<CompletedTask>(tasklist, `${current}-target`)).toMatchObject({
          status: "completed",
          additionalStatus: "postponed",
        });
        expect(findTask<PostponedTask>(tasklist, `${current}-later`)).toMatchObject({
          title: "Later task",
          status: "postponed",
          list: current === "open" ? "open-new" : "open",
          postponedUntil: new Date(2025, 0, 2),
        });
        expect(tasklist.current.actionedCount).toBe(1);
        if (current === "closed") {
          expect(tasklist.current.showNext).toBe(false);
          expect(tasklist.current.willBeMarkedForReview).toBe(false);
        }
      });

      it("completes current tasks", () => {
        const tasklist = createTaskListForCurrent(current);

        runAction(tasklist, { type: "CompleteTask", id: `${current}-target` });

        expect(findTask<CompletedTask>(tasklist, `${current}-target`)).toMatchObject({
          status: "completed",
          completedAt: baseNow,
        });
        expect(tasklist.current.actionedCount).toBe(1);
        if (current === "closed") {
          expect(tasklist.current.showNext).toBe(false);
          expect(tasklist.current.willBeMarkedForReview).toBe(false);
        }
      });

      it("deletes current tasks", () => {
        const tasklist = createTaskListForCurrent(current);

        runAction(tasklist, { type: "DeleteTask", id: `${current}-target` });

        expect(findTask<DeletedTask>(tasklist, `${current}-target`)).toMatchObject({
          status: "deleted",
          deletedAt: baseNow,
        });
        expect(tasklist.current.actionedCount).toBe(1);
        if (current === "closed") {
          expect(tasklist.current.showNext).toBe(false);
          expect(tasklist.current.willBeMarkedForReview).toBe(false);
        }
      });
    });
  }

  it("does not readd an already readded completed task", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(
      createTask("done", {
        list: "open",
        status: "completed",
        completedAt: baseNow,
        additionalStatus: "readded",
      }),
    );

    runAction(tasklist, { type: "ReaddTask", id: "done" }, { id: "ignored" });

    expect(tasklist.tasks).toHaveLength(1);
  });

  it("does not postpone an already postponed completed task", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(
      createTask("done", {
        list: "open",
        status: "completed",
        completedAt: baseNow,
        additionalStatus: "postponed",
      }),
    );

    runAction(tasklist, { type: "PostponeTask", id: "done" }, { id: "ignored" });

    expect(tasklist.tasks).toHaveLength(1);
  });

  it("does not complete, delete, zero, readd, or postpone tasks that are not new", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(
      createTask("completed", { list: "open", status: "completed", completedAt: baseNow }),
      createTask("deleted", { list: "open", status: "deleted", deletedAt: baseNow }),
    );

    runAction(tasklist, { type: "CompleteTask", id: "completed" });
    runAction(tasklist, { type: "DeleteTask", id: "completed" });
    runAction(tasklist, { type: "ZeroTask", id: "completed" });
    runAction(tasklist, { type: "ReaddTask", id: "deleted" }, { id: "readd-from-deleted" });
    runAction(tasklist, { type: "PostponeTask", id: "deleted" }, { id: "postpone-from-deleted" });

    expect(findTask(tasklist, "completed")).toStrictEqual(
      createTask("completed", { list: "open", status: "completed", completedAt: baseNow }),
    );
    expect(findTask(tasklist, "deleted")).toStrictEqual(
      createTask("deleted", { list: "open", status: "deleted", deletedAt: baseNow }),
    );
    expect(findTask(tasklist, "readd-from-deleted")).toMatchObject({
      status: "new",
      title: "deleted",
      list: "open-new",
    });
    expect(findTask<PostponedTask>(tasklist, "postpone-from-deleted")).toMatchObject({
      status: "postponed",
      title: "deleted",
      list: "open-new",
    });
    expect(tasklist.current.actionedCount).toBe(0);
  });

  it("toggles zero only on new tasks", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(
      createTask("new-task", { list: "open" }),
      createTask("completed-task", { list: "open", status: "completed", completedAt: baseNow }),
    );

    runAction(tasklist, { type: "ZeroTask", id: "new-task" });
    runAction(tasklist, { type: "ZeroTask", id: "completed-task" });

    expect(findTask(tasklist, "new-task").zero).toBe(true);
    expect(findTask(tasklist, "completed-task").zero).toBeUndefined();

    runAction(tasklist, { type: "ZeroTask", id: "new-task" });

    expect(findTask(tasklist, "new-task").zero).toBe(false);
  });
});

describe("AF4 cleanup", () => {
  it("removes deleted-list tasks and old actioned tasks from the current list", () => {
    const tasklist = createTaskList();
    const oldDate = new Date("2025-01-01T00:00:00.000Z");
    const cleanupDate = new Date("2025-01-01T13:00:00.000Z");
    tasklist.tasks.push(
      createTask("already-deleted-list", { list: "deleted", status: "new" }),
      createTask("old-completed", { list: "open", status: "completed", completedAt: oldDate }),
      createTask("old-deleted", { list: "open", status: "deleted", deletedAt: oldDate }),
      createTask("old-other-list", { list: "closed", status: "completed", completedAt: oldDate }),
      createTask("fresh-completed", {
        list: "open",
        status: "completed",
        completedAt: new Date("2025-01-01T05:00:00.000Z"),
      }),
    );

    runAction(tasklist, { type: "Cleanup", now: cleanupDate });

    expect(tasklist.tasks.map((task) => task.id)).toEqual(["old-other-list", "fresh-completed"]);
    expect(findTask(tasklist, "old-other-list").list).toBe("closed");
  });

  it("backfills missing action timestamps before evaluating old tasks", () => {
    const tasklist = createTaskList();
    const cleanupDate = new Date("2025-01-01T13:00:00.000Z");
    tasklist.tasks.push(
      createTask("completed-without-date", { list: "open", status: "completed" }),
      createTask("deleted-without-date", { list: "open", status: "deleted" }),
    );

    runAction(tasklist, { type: "Cleanup", now: cleanupDate });

    expect(tasklist.tasks).toHaveLength(0);
  });

  it("moves due postponed tasks during transition back to open", () => {
    const tasklist = createTaskList();
    const dueDate = new Date("2025-01-02T00:01:00.000Z");
    tasklist.current = {
      actionedCount: 1,
      list: "closed",
      showNext: false,
      willBeMarkedForReview: false,
    };
    tasklist.tasks.push(
      createTask("closed-task", { list: "closed" }),
      createTask("due-postponed", {
        list: "open",
        status: "postponed",
        postponedUntil: new Date("2025-01-02T00:00:00.000Z"),
      }),
    );

    runAction(tasklist, { type: "Next" }, { id: "due-created", now: dueDate });

    expect(tasklist.current.list).toBe("open");
    expect(findTask(tasklist, "due-created")).toMatchObject({
      title: "due-postponed",
      status: "new",
      list: "open",
    });
    expect(tasklist.tasks.map((task) => task.id)).not.toContain("due-postponed");
  });
});

function createTaskListForCurrent(current: "open" | "closed" | "review") {
  const tasklist = createTaskList();
  tasklist.current = makeCurrent(current);
  tasklist.tasks.push(createTask(`${current}-target`, { list: current }));
  if (current === "open") {
    tasklist.tasks.push(createTask("existing-closed", { list: "closed" }));
  }
  return tasklist;
}

function makeCurrent(current: "open" | "closed" | "review"): CurrentList {
  switch (current) {
    case "open":
      return { actionedCount: 0, list: "open", showNext: true };
    case "closed":
      return {
        actionedCount: 0,
        list: "closed",
        showNext: false,
        willBeMarkedForReview: true,
      };
    case "review":
      return { actionedCount: 0, list: "review", showNext: true };
  }
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
