import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { Task, TaskList as TaskListState, ViewListType } from "@/app/types.ts";
import type { TaskListViewMode } from "../types.ts";
import TaskList from "./TaskList.vue";

const createdAt = new Date("2026-06-10T00:00:00.000Z");

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    createdAt,
    status: "new",
    list: "open",
    ...overrides,
  } as Task;
}

function makeTaskList(overrides: Partial<TaskListState> = {}): TaskListState {
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

function mountTaskList(options: {
  readonly state: TaskListState;
  readonly viewList?: ViewListType;
  readonly viewMode?: TaskListViewMode;
}) {
  return mount(TaskList, {
    props: {
      state: options.state,
      viewList: options.viewList ?? "open",
      viewMode: options.viewMode ?? "current",
    },
  });
}

function renderedTaskIds(wrapper: ReturnType<typeof mountTaskList>) {
  return wrapper.findAll("[data-id]").map((item) => item.attributes("data-id"));
}

describe("TaskList", () => {
  it("renders only tasks from the selected view list and hides postponed tasks", () => {
    const state = makeTaskList({
      tasks: [
        makeTask("open-new"),
        makeTask("open-postponed", {
          status: "postponed",
          postponedUntil: createdAt,
        }),
        makeTask("closed-new", { list: "closed" }),
      ],
    });

    const wrapper = mountTaskList({ state, viewList: "open" });

    expect(renderedTaskIds(wrapper)).toStrictEqual(["open-new"]);
  });

  it("renders only completed tasks in completed view mode", () => {
    const state = makeTaskList({
      tasks: [
        makeTask("new"),
        makeTask("completed", {
          status: "completed",
          completedAt: createdAt,
        }),
      ],
    });

    const wrapper = mountTaskList({ state, viewMode: "completed" });

    expect(renderedTaskIds(wrapper)).toStrictEqual(["completed"]);
  });

  it("renders only zero tasks in zero view mode", () => {
    const state = makeTaskList({
      tasks: [makeTask("ordinary"), makeTask("zero", { zero: true })],
    });

    const wrapper = mountTaskList({ state, viewMode: "zero" });

    expect(renderedTaskIds(wrapper)).toStrictEqual(["zero"]);
  });

  it("does not render a side label for simple current lists", () => {
    const state = makeTaskList({
      system: "simple",
      tasks: [makeTask("task")],
    });

    const wrapper = mountTaskList({ state });

    expect(wrapper.text()).not.toContain("Открытый список");
  });

  it("renders a side label for the later view even for simple lists", () => {
    const state = makeTaskList({
      system: "simple",
      tasks: [makeTask("later", { list: "later" })],
    });

    const wrapper = mountTaskList({ state, viewList: "later" });

    expect(wrapper.text()).toContain("Когда-нибудь");
  });

  it("shows Next help only for the current list when showNext is true", async () => {
    const state = makeTaskList({
      current: {
        list: "open",
        actionedCount: 0,
        showNext: true,
      },
      tasks: [makeTask("task"), makeTask("other")],
    });

    const wrapper = mountTaskList({ state, viewList: "open" });

    expect(wrapper.text()).toContain("Далее");

    await wrapper.setProps({ viewList: "closed" });

    expect(wrapper.text()).not.toContain("Далее");
  });
});
