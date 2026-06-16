import { describe, expect, it } from "vitest";
import type { Task, TaskList } from "@/app/types.ts";
import { handleTaskListIntent, type TaskListCommandContext } from "./TaskListInteraction.ts";

function makeTask(id: string): Task {
  return {
    id,
    title: "Task",
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    status: "new",
    list: "closed",
  };
}

function makeTaskList(overrides: Partial<TaskList> = {}): TaskList {
  return {
    id: "task-list",
    system: "af4",
    current: {
      list: "open",
      actionedCount: 0,
      showNext: false,
    },
    tasks: [],
    ...overrides,
  };
}

function makeContext(
  taskList: TaskList = makeTaskList(),
  overrides: Partial<TaskListCommandContext> = {},
): TaskListCommandContext {
  return {
    taskList,
    viewList: taskList.current.list,
    viewMode: "current",
    focusedTaskId: null,
    ...overrides,
  };
}

describe("handleTaskListIntent", () => {
  it("creates an add task action for ordinary todos and focuses the input after dispatch", () => {
    expect(
      handleTaskListIntent({ type: "submit-new-todo", title: "Task" }, makeContext(makeTaskList())),
    ).toStrictEqual({
      action: { type: "AddTask", title: "Task" },
      effects: {
        beforeDispatch: [],
        afterDispatch: [{ type: "focus-new-todo-input" }],
      },
    });
  });

  it("creates a postponed add action for new postponed todos", () => {
    expect(
      handleTaskListIntent(
        { type: "submit-new-todo", title: "Task", postponed: true },
        makeContext(makeTaskList()),
      ).action,
    ).toStrictEqual({
      type: "AddPostponedTask",
      title: "Task",
    });
  });

  it("creates a readd action when editing an existing task without postponing it", () => {
    expect(
      handleTaskListIntent(
        { type: "submit-new-todo", title: "Renamed", origId: "task" },
        makeContext(makeTaskList()),
      ).action,
    ).toStrictEqual({
      type: "ReaddTask",
      id: "task",
      title: "Renamed",
    });
  });

  it("creates a postpone action when editing an existing task as postponed", () => {
    expect(
      handleTaskListIntent(
        { type: "submit-new-todo", title: "Later", origId: "task", postponed: true },
        makeContext(makeTaskList()),
      ).action,
    ).toStrictEqual({
      type: "PostponeTask",
      id: "task",
      title: "Later",
    });
  });

  it("returns semantic notify effects for add-todo visibility rules", () => {
    expect(
      handleTaskListIntent(
        { type: "submit-new-todo", title: "Task" },
        makeContext(
          makeTaskList({
            current: {
              list: "closed",
              actionedCount: 0,
              showNext: false,
              willBeMarkedForReview: true,
            },
          }),
        ),
      ).effects.afterDispatch,
    ).toStrictEqual([{ type: "focus-new-todo-input" }, { type: "notify-task-added-to-open" }]);

    expect(
      handleTaskListIntent(
        { type: "submit-new-todo", title: "Task", postponed: true },
        makeContext(
          makeTaskList({
            current: {
              list: "review",
              actionedCount: 0,
              showNext: true,
            },
          }),
        ),
      ).effects.afterDispatch,
    ).toStrictEqual([{ type: "focus-new-todo-input" }, { type: "notify-task-added-for-tomorrow" }]);

    expect(
      handleTaskListIntent(
        { type: "submit-new-todo", title: "Task" },
        makeContext(
          makeTaskList({
            current: {
              list: "open",
              actionedCount: 1,
              showNext: false,
            },
          }),
        ),
      ).effects.afterDispatch,
    ).toStrictEqual([
      { type: "focus-new-todo-input" },
      { type: "notify-task-staged-after-open-actions" },
    ]);
  });

  it("notifies simple lists only for postponed additions", () => {
    const simple = makeTaskList({ system: "simple" });

    expect(
      handleTaskListIntent({ type: "submit-new-todo", title: "Task" }, makeContext(simple)).effects
        .afterDispatch,
    ).toStrictEqual([{ type: "focus-new-todo-input" }]);

    expect(
      handleTaskListIntent(
        { type: "submit-new-todo", title: "Task", postponed: true },
        makeContext(simple),
      ).effects.afterDispatch,
    ).toStrictEqual([{ type: "focus-new-todo-input" }, { type: "notify-task-added-for-tomorrow" }]);
  });

  it("returns no action and no effects when a focused task command has no focused task", () => {
    expect(
      handleTaskListIntent({ type: "complete-focused" }, makeContext(makeTaskList())),
    ).toStrictEqual({
      effects: {
        beforeDispatch: [],
        afterDispatch: [],
      },
    });
  });

  it("looks up the focused task inside the module", () => {
    const taskList = makeTaskList({ tasks: [makeTask("task")] });

    expect(
      handleTaskListIntent(
        { type: "complete-focused" },
        makeContext(taskList, { focusedTaskId: "task" }),
      ).action,
    ).toStrictEqual({ type: "CompleteTask", id: "task" });
  });

  it("returns semantic effects for focused task movement commands", () => {
    const taskList = makeTaskList({ tasks: [makeTask("task")] });

    expect(
      handleTaskListIntent(
        { type: "toggle-later-for-focused" },
        makeContext(taskList, { focusedTaskId: "task" }),
      ),
    ).toStrictEqual({
      action: { type: "LaterTask", id: "task" },
      effects: {
        beforeDispatch: [],
        afterDispatch: [{ type: "notify-task-moved-to-later", taskId: "task" }],
      },
    });

    expect(
      handleTaskListIntent(
        { type: "toggle-later-for-focused" },
        makeContext(taskList, { focusedTaskId: "task", viewList: "later" }),
      ),
    ).toStrictEqual({
      action: { type: "ReaddTask", id: "task" },
      effects: {
        beforeDispatch: [],
        afterDispatch: [{ type: "notify-task-readded-to-open", taskId: "task" }],
      },
    });
  });

  it("creates a dot action for the focused task", () => {
    const taskList = makeTaskList({ tasks: [makeTask("task")] });

    expect(
      handleTaskListIntent(
        { type: "dot-focused" },
        makeContext(taskList, { focusedTaskId: "task" }),
      ).action,
    ).toStrictEqual({ type: "DotTask", id: "task" });
  });
});
