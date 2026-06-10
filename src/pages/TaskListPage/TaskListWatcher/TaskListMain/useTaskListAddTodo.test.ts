import { describe, expect, it } from "vitest";
import type { TaskList } from "@/app/types.ts";
import { getAddTodoAction, getAddTodoNotification } from "./useTaskListAddTodo.ts";

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

describe("getAddTodoAction", () => {
  it("creates an add task action for ordinary todos", () => {
    expect(getAddTodoAction("Task", {})).toStrictEqual({ type: "AddTask", title: "Task" });
  });

  it("creates a postponed add action for new postponed todos", () => {
    expect(getAddTodoAction("Task", { postponed: true })).toStrictEqual({
      type: "AddPostponedTask",
      title: "Task",
    });
  });

  it("creates a readd action when editing an existing task without postponing it", () => {
    expect(getAddTodoAction("Renamed", { origId: "task" })).toStrictEqual({
      type: "ReaddTask",
      id: "task",
      title: "Renamed",
    });
  });

  it("creates a postpone action when editing an existing task as postponed", () => {
    expect(getAddTodoAction("Later", { origId: "task", postponed: true })).toStrictEqual({
      type: "PostponeTask",
      id: "task",
      title: "Later",
    });
  });
});

describe("getAddTodoNotification", () => {
  it("does not notify for ordinary AF4 open-list additions before actions", () => {
    expect(getAddTodoNotification(makeTaskList(), {})).toBeUndefined();
  });

  it("notifies when AF4 adds an ordinary task outside the open list", () => {
    expect(
      getAddTodoNotification(
        makeTaskList({
          current: {
            list: "closed",
            actionedCount: 0,
            showNext: false,
            willBeMarkedForReview: true,
          },
        }),
        {},
      ),
    ).toBe("Задача добавлена в открытый список");
  });

  it("notifies when AF4 adds a postponed task outside the open list", () => {
    expect(
      getAddTodoNotification(
        makeTaskList({
          current: {
            list: "review",
            actionedCount: 0,
            showNext: true,
          },
        }),
        { postponed: true },
      ),
    ).toBe("Задача добавлена на завтра");
  });

  it("notifies when AF4 stages a task after open-list actions", () => {
    expect(
      getAddTodoNotification(
        makeTaskList({
          current: {
            list: "open",
            actionedCount: 1,
            showNext: false,
          },
        }),
        {},
      ),
    ).toBe("Задача появится после перехода из закрытого списка");
  });

  it("notifies simple lists only for postponed additions", () => {
    const simple = makeTaskList({ system: "simple" });

    expect(getAddTodoNotification(simple, {})).toBeUndefined();
    expect(getAddTodoNotification(simple, { postponed: true })).toBe("Задача добавлена на завтра");
  });
});
