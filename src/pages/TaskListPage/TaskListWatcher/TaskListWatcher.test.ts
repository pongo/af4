/* eslint-disable vue/no-mutating-props */
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, type PropType } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskList } from "@/app/types.ts";
import TaskListWatcher from "./TaskListWatcher.vue";

const mocks = vi.hoisted(() => ({
  saveTaskList: vi.fn(),
  alert: vi.fn(),
}));

vi.mock("@/app/db.ts", () => ({
  db: {
    saveTaskList: mocks.saveTaskList,
  },
}));

vi.mock("@vueuse/core", async () => {
  const actual = await vi.importActual<typeof import("@vueuse/core")>("@vueuse/core");

  return {
    ...actual,
    useDebouncedRefHistory: () => ({
      last: { value: { snapshot: { id: "task-list" } } },
      undo: vi.fn(),
      redo: vi.fn(),
    }),
  };
});

vi.mock("./TaskListMain/TaskListMain.vue", () => ({
  default: defineComponent({
    props: {
      state: { type: Object as PropType<TaskList>, required: true },
    },
    emits: ["undo", "redo"],
    setup(props, { emit }) {
      return () =>
        h("div", [
          h("span", { "data-test": "count" }, props.state.tasks.length),
          h(
            "button",
            {
              "data-test": "mutate",
              onClick: () => {
                props.state.tasks.push({
                  id: "added",
                  title: "Added",
                  createdAt: new Date("2026-06-10T00:00:00.000Z"),
                  status: "new",
                  list: "open",
                });
              },
            },
            "Mutate",
          ),
          h(
            "button",
            {
              "data-test": "undo",
              onClick: () => {
                emit("undo", props.state.id);
              },
            },
            "Undo",
          ),
        ]);
    },
  }),
}));

function makeTaskList(): TaskList {
  return {
    id: "task-list",
    system: "simple",
    current: {
      list: "open",
      actionedCount: 0,
      showNext: false,
    },
    tasks: [
      {
        id: "initial",
        title: "Initial",
        createdAt: new Date("2026-06-10T00:00:00.000Z"),
        status: "new",
        list: "open",
      },
    ],
  };
}

describe("TaskListWatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("alert", mocks.alert);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("clones initial data before passing it to TaskListMain", async () => {
    const initialData = makeTaskList();
    const wrapper = mount(TaskListWatcher, { props: { initialData } });

    await wrapper.find("[data-test='mutate']").trigger("click");

    expect(wrapper.find("[data-test='count']").text()).toBe("2");
    expect(initialData.tasks).toHaveLength(1);
  });

  it("saves cloned state after local state changes", async () => {
    const initialData = makeTaskList();
    const wrapper = mount(TaskListWatcher, { props: { initialData } });

    await wrapper.find("[data-test='mutate']").trigger("click");
    await nextTick();

    expect(mocks.saveTaskList).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "task-list",
        tasks: expect.arrayContaining([expect.objectContaining({ id: "added" })]),
      }),
    );
    expect(mocks.saveTaskList.mock.calls[0][0]).not.toBe(initialData);
  });

  it("alerts when saving fails", async () => {
    mocks.saveTaskList.mockRejectedValueOnce(new Error("Disk full"));
    const wrapper = mount(TaskListWatcher, { props: { initialData: makeTaskList() } });

    await wrapper.find("[data-test='mutate']").trigger("click");
    await nextTick();
    await nextTick();

    expect(mocks.alert).toHaveBeenCalledWith("Failed to save task list: Disk full");
  });
});
