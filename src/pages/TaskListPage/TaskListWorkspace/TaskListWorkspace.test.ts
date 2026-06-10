/* eslint-disable vue/one-component-per-file */
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref, type PropType } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskList, UserAction, ViewListType } from "@/app/types.ts";
import type { TaskListViewMode } from "./types.ts";
import TaskListWorkspace from "./TaskListWorkspace.vue";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  notify: vi.fn(),
  useDailyCleanup: vi.fn(),
  useTaskListHotkeys: vi.fn(),
  newTodoFocus: vi.fn(),
  taskListNavigate: vi.fn(),
}));

vi.mock("@/app/model/dispatch.ts", () => ({
  dispatch: mocks.dispatch,
}));

vi.mock("@/app/composables/useDailyCleanup.ts", () => ({
  useDailyCleanup: mocks.useDailyCleanup,
}));

vi.mock("vue3-toastify", () => ({
  toast: mocks.notify,
}));

vi.mock("./useTaskListHotkeys.ts", () => ({
  useTaskListHotkeys: mocks.useTaskListHotkeys,
}));

vi.mock("./NewTodoForm/NewTodoForm.vue", () => ({
  default: defineComponent({
    emits: ["add-todo", "focus-task"],
    setup(_, { emit, expose }) {
      expose({
        focus: mocks.newTodoFocus,
        focusWithText: vi.fn(),
      });

      return () =>
        h("button", {
          "data-test": "add-todo",
          onClick: () => {
            emit("add-todo", "Added task", {});
          },
        });
    },
  }),
}));

vi.mock("./TaskList/TaskList.vue", () => ({
  default: defineComponent({
    props: {
      state: { type: Object as PropType<TaskList>, required: true },
      viewList: { type: String as PropType<ViewListType>, required: true },
      viewMode: { type: String as PropType<TaskListViewMode>, required: true },
    },
    emits: ["next"],
    setup(props, { emit, expose }) {
      expose({
        navigate: mocks.taskListNavigate,
        getFocusedItem: () => undefined,
      });

      return () =>
        h("div", [
          h("span", { "data-test": "view-mode" }, props.viewMode),
          h("span", { "data-test": "view-list" }, props.viewList),
          h("button", {
            "data-test": "next",
            onClick: () => {
              emit("next");
            },
          }),
        ]);
    },
  }),
}));

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

describe("TaskListWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches add-todo actions and focuses the form again", async () => {
    const state = makeTaskList();
    const wrapper = mount(TaskListWorkspace, { props: { state } });

    await wrapper.find("[data-test='add-todo']").trigger("click");
    await nextTick();

    expect(mocks.dispatch).toHaveBeenCalledWith(state, { type: "AddTask", title: "Added task" });
    expect(mocks.newTodoFocus).toHaveBeenCalledOnce();
  });

  it("dispatches cleanup through daily cleanup", () => {
    const state = makeTaskList();
    mount(TaskListWorkspace, { props: { state } });

    const cleanup = mocks.useDailyCleanup.mock.calls[0][0] as () => void;
    cleanup();

    expect(mocks.dispatch).toHaveBeenCalledWith(
      state,
      expect.objectContaining({ type: "Cleanup" }) satisfies Partial<UserAction>,
    );
  });

  it("dispatches Next and navigates home in current view mode", async () => {
    const state = makeTaskList();
    const wrapper = mount(TaskListWorkspace, { props: { state } });

    await wrapper.find("[data-test='next']").trigger("click");
    await nextTick();

    expect(mocks.dispatch).toHaveBeenCalledWith(state, { type: "Next" });
    expect(mocks.taskListNavigate).toHaveBeenCalledWith("home");
  });

  it("does not dispatch Next outside current view mode", async () => {
    const viewMode = ref<TaskListViewMode>("current");
    const state = makeTaskList({
      tasks: [
        {
          id: "later",
          title: "Later",
          createdAt: new Date("2026-06-10T00:00:00.000Z"),
          status: "new",
          list: "later",
        },
      ],
    });
    const wrapper = mount(TaskListWorkspace, { props: { state } });
    const hotkeyOptions = mocks.useTaskListHotkeys.mock.calls[0][0] as {
      readonly viewMode: typeof viewMode;
      readonly toggleLaterView: () => void;
      readonly next: () => void;
    };

    hotkeyOptions.toggleLaterView();
    await nextTick();
    mocks.dispatch.mockClear();

    hotkeyOptions.next();

    expect(wrapper.find("[data-test='view-mode']").text()).toBe("later");
    expect(wrapper.find("[data-test='view-list']").text()).toBe("later");
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("toggles later view and navigates home", async () => {
    const state = makeTaskList({
      tasks: [
        {
          id: "later",
          title: "Later",
          createdAt: new Date("2026-06-10T00:00:00.000Z"),
          status: "new",
          list: "later",
        },
      ],
    });
    const wrapper = mount(TaskListWorkspace, { props: { state } });
    const hotkeyOptions = mocks.useTaskListHotkeys.mock.calls[0][0] as {
      readonly toggleLaterView: () => void;
    };

    hotkeyOptions.toggleLaterView();
    await nextTick();

    expect(wrapper.find("[data-test='view-mode']").text()).toBe("later");
    expect(wrapper.find("[data-test='view-list']").text()).toBe("later");
    expect(mocks.taskListNavigate).toHaveBeenCalledWith("home");
  });
});
