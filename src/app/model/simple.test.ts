import { nanoid } from "nanoid";
import { describe, expect, it } from "vitest";
import type { CompletedTask, DeletedTask, PostponedTask, Task, TaskList } from "../types.ts";
import { makeSimple } from "./simple.ts";
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
    system: "simple",
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
  action: Parameters<ReturnType<typeof makeSimple>>[1],
  options: { id?: string; now?: Date } = {},
) {
  const date = options.now ?? baseNow;
  makeSimple({ generateId: () => options.id ?? `${action.type}-id`, now: () => date })(
    tasklist,
    action,
  );
}

function tasksCountByLists(tasklist: TaskList) {
  return {
    open: tasklist.tasks.filter((task) => task.list === "open").length,
    closed: tasklist.tasks.filter((task) => task.list === "closed").length,
    review: tasklist.tasks.filter((task) => task.list === "review").length,
    later: tasklist.tasks.filter((task) => task.list === "later").length,
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

describe("Simple actions", () => {
  it("adds ordinary tasks to open", () => {
    const tasklist = createTaskList();

    runAction(tasklist, { type: "AddTask", title: "Added task" }, { id: "added-task" });

    expect(findTask(tasklist, "added-task")).toMatchObject({
      title: "Added task",
      createdAt: baseNow,
      status: "new",
      list: "open",
    });
    expect(tasklist.current).toStrictEqual({
      list: "open",
      actionedCount: 0,
      showNext: false,
    });
  });

  it("adds postponed tasks to open for tomorrow after early morning", () => {
    const tasklist = createTaskList();
    const now = new Date("2025-01-01T05:00:00.000Z");

    runAction(
      tasklist,
      { type: "AddPostponedTask", title: "Postponed task" },
      { id: "later", now },
    );

    expect(findTask<PostponedTask>(tasklist, "later")).toMatchObject({
      title: "Postponed task",
      createdAt: now,
      status: "postponed",
      list: "open",
      postponedUntil: new Date(2025, 0, 2),
    });
  });

  it("adds early-morning postponed tasks for today", () => {
    const tasklist = createTaskList();
    const now = new Date(2025, 0, 1, 2);

    runAction(tasklist, { type: "AddPostponedTask", title: "Early task" }, { id: "early", now });

    expect(findTask<PostponedTask>(tasklist, "early").postponedUntil).toStrictEqual(
      new Date(2025, 0, 1),
    );
  });

  it("completes new tasks and clears zero markers", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(createTask("target", { list: "open", zero: true }));

    runAction(tasklist, { type: "CompleteTask", id: "target" });

    expect(findTask<CompletedTask>(tasklist, "target")).toMatchObject({
      status: "completed",
      completedAt: baseNow,
    });
    expect(findTask(tasklist, "target").zero).toBeUndefined();
  });

  it("completes new tasks and clears dot markers", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(createTask("target", { list: "open", dot: true }));

    runAction(tasklist, { type: "CompleteTask", id: "target" });

    expect(findTask(tasklist, "target").dot).toBeUndefined();
  });

  it("deletes new tasks and clears zero markers", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(createTask("target", { list: "open", zero: true }));

    runAction(tasklist, { type: "DeleteTask", id: "target" });

    expect(findTask<DeletedTask>(tasklist, "target")).toMatchObject({
      status: "deleted",
      deletedAt: baseNow,
    });
    expect(findTask(tasklist, "target").zero).toBeUndefined();
  });

  it("deletes new tasks and clears dot markers", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(createTask("target", { list: "open", dot: true }));

    runAction(tasklist, { type: "DeleteTask", id: "target" });

    expect(findTask(tasklist, "target").dot).toBeUndefined();
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

  it("toggles dot only on new tasks", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(
      createTask("new-task", { list: "open" }),
      createTask("completed-task", { list: "open", status: "completed", completedAt: baseNow }),
    );

    runAction(tasklist, { type: "DotTask", id: "new-task" });
    runAction(tasklist, { type: "DotTask", id: "completed-task" });

    expect(findTask(tasklist, "new-task").dot).toBe(true);
    expect(findTask(tasklist, "completed-task").dot).toBeUndefined();

    runAction(tasklist, { type: "DotTask", id: "new-task" });

    expect(findTask(tasklist, "new-task").dot).toBe(false);
  });

  it("readds new tasks to open and marks original as completed", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(createTask("target", { list: "open" }));

    runAction(
      tasklist,
      { type: "ReaddTask", id: "target", title: "Renamed task" },
      { id: "readded" },
    );

    expect(findTask<CompletedTask>(tasklist, "target")).toMatchObject({
      status: "completed",
      additionalStatus: "readded",
      completedAt: baseNow,
    });
    expect(findTask(tasklist, "readded")).toMatchObject({
      title: "Renamed task",
      status: "new",
      list: "open",
    });
  });

  it("readds using the original title when no title is provided", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(createTask("target", { list: "open", title: "Original title" }));

    runAction(tasklist, { type: "ReaddTask", id: "target" }, { id: "readded" });

    expect(findTask(tasklist, "readded").title).toBe("Original title");
  });

  it("postpones tasks to open and marks original as completed", () => {
    const tasklist = createTaskList();
    const now = new Date(2025, 0, 1, 2);
    tasklist.tasks.push(createTask("target", { list: "open" }));

    runAction(
      tasklist,
      { type: "PostponeTask", id: "target", title: "Later task" },
      { id: "later", now },
    );

    expect(findTask<CompletedTask>(tasklist, "target")).toMatchObject({
      status: "completed",
      additionalStatus: "postponed",
      completedAt: now,
    });
    expect(findTask<PostponedTask>(tasklist, "later")).toMatchObject({
      title: "Later task",
      status: "postponed",
      list: "open",
      postponedUntil: new Date(2025, 0, 1),
    });
  });

  it("moves tasks to later and marks original as completed", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(createTask("target", { list: "open" }));

    runAction(tasklist, { type: "LaterTask", id: "target" }, { id: "later" });

    expect(findTask<CompletedTask>(tasklist, "target")).toMatchObject({
      status: "completed",
      additionalStatus: "later",
      completedAt: baseNow,
    });
    expect(findTask(tasklist, "later")).toMatchObject({
      title: "target",
      status: "new",
      list: "later",
    });
    expect(tasksCountByLists(tasklist)).toMatchObject({
      later: 1,
    });
  });

  it("does not move already latered completed tasks twice", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(
      createTask("later-done", {
        list: "open",
        status: "completed",
        completedAt: baseNow,
        additionalStatus: "later",
      }),
    );

    runAction(tasklist, { type: "LaterTask", id: "later-done" }, { id: "ignored-later" });

    expect(tasklist.tasks.map((task) => task.id)).toEqual(["later-done"]);
  });

  it("does not readd or postpone already actioned completed tasks twice", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(
      createTask("readded-done", {
        list: "open",
        status: "completed",
        completedAt: baseNow,
        additionalStatus: "readded",
      }),
      createTask("postponed-done", {
        list: "open",
        status: "completed",
        completedAt: baseNow,
        additionalStatus: "postponed",
      }),
    );

    runAction(tasklist, { type: "ReaddTask", id: "readded-done" }, { id: "ignored-readd" });
    runAction(tasklist, { type: "PostponeTask", id: "postponed-done" }, { id: "ignored-postpone" });

    expect(tasklist.tasks.map((task) => task.id)).toEqual(["readded-done", "postponed-done"]);
  });

  it("does not complete, delete, or zero tasks that are not new", () => {
    const tasklist = createTaskList();
    tasklist.tasks.push(
      createTask("completed", { list: "open", status: "completed", completedAt: baseNow }),
      createTask("deleted", { list: "open", status: "deleted", deletedAt: baseNow }),
    );

    runAction(tasklist, { type: "CompleteTask", id: "completed" });
    runAction(tasklist, { type: "DeleteTask", id: "completed" });
    runAction(tasklist, { type: "ZeroTask", id: "completed" });
    runAction(tasklist, { type: "CompleteTask", id: "deleted" });
    runAction(tasklist, { type: "DeleteTask", id: "deleted" });
    runAction(tasklist, { type: "ZeroTask", id: "deleted" });

    expect(findTask(tasklist, "completed")).toStrictEqual(
      createTask("completed", { list: "open", status: "completed", completedAt: baseNow }),
    );
    expect(findTask(tasklist, "deleted")).toStrictEqual(
      createTask("deleted", { list: "open", status: "deleted", deletedAt: baseNow }),
    );
  });

  it("throws for Next because simple list transitions are not implemented", () => {
    const tasklist = createTaskList();

    expect(() => {
      runAction(tasklist, { type: "Next" });
    }).toThrow("Not implemented");
  });
});

describe("Simple cleanup", () => {
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

  it("moves due postponed tasks to open with a new generated id", () => {
    const tasklist = createTaskList();
    const dueDate = new Date("2025-01-02T00:01:00.000Z");
    tasklist.tasks.push(
      createTask("due-postponed", {
        list: "open",
        status: "postponed",
        postponedUntil: new Date("2025-01-02T00:00:00.000Z"),
      }),
      createTask("not-due-postponed", {
        list: "open",
        status: "postponed",
        postponedUntil: new Date("2025-01-03T00:00:00.000Z"),
      }),
    );

    runAction(tasklist, { type: "Cleanup", now: dueDate }, { id: "due-created", now: dueDate });

    expect(findTask(tasklist, "due-created")).toMatchObject({
      title: "due-postponed",
      createdAt: dueDate,
      status: "new",
      list: "open",
    });
    expect(tasklist.tasks.map((task) => task.id)).not.toContain("due-postponed");
    expect(findTask<PostponedTask>(tasklist, "not-due-postponed").status).toBe("postponed");
  });

  it("keeps postponed tasks waiting until their postponed date", () => {
    const tasklist = createTaskList();
    const now = new Date("2025-01-01T18:59:39.584Z");

    runAction(
      tasklist,
      { type: "AddPostponedTask", title: "Postponed Task" },
      { id: "later", now },
    );

    expect(tasksCountByStatuses(tasklist)).toEqual({
      new: 0,
      completed: 0,
      postponed: 1,
      deleted: 0,
    });
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 1,
      closed: 0,
      review: 0,
      later: 0,
      deleted: 0,
    });

    const beforeDue = new Date("2025-01-01T19:03:00.000Z");
    runAction(tasklist, { type: "Cleanup", now: beforeDue }, { id: "ignored", now: beforeDue });

    expect(tasksCountByStatuses(tasklist)).toEqual({
      new: 0,
      completed: 0,
      postponed: 1,
      deleted: 0,
    });

    const postponedUntil = findTask<PostponedTask>(tasklist, "later").postponedUntil;
    const afterDue = new Date(postponedUntil.getTime() + 1000);
    runAction(
      tasklist,
      { type: "Cleanup", now: afterDue },
      { id: "created-after-due", now: afterDue },
    );

    expect(tasksCountByStatuses(tasklist)).toEqual({
      new: 1,
      completed: 0,
      postponed: 0,
      deleted: 0,
    });
    expect(findTask(tasklist, "created-after-due")).toMatchObject({
      title: "Postponed Task",
      createdAt: afterDue,
      status: "new",
      list: "open",
    });
  });
});
