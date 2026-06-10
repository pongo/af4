import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import type { RouteRecordRaw } from "vue-router";
import type { TaskList } from "./types.ts";

const mocks = vi.hoisted(() => ({
  labels: [] as { id: string; name: string; position: number }[],
  updateTaskListLabels: vi.fn(),
  getTaskList: vi.fn(),
  dispatch: vi.fn(),
}));

vi.mock("@/app/lib/taskListLabelsStore", () => ({
  taskListLabelsStore: () => ({
    taskListLabels: {
      get value() {
        return mocks.labels;
      },
    },
    getTaskListLabel: (id: string) => mocks.labels.find((label) => label.id === id),
  }),
}));

vi.mock("@/app/db", () => ({
  db: {
    updateTaskListLabels: mocks.updateTaskListLabels,
    getTaskList: mocks.getTaskList,
  },
}));

vi.mock("@/app/model/dispatch", () => ({
  dispatch: mocks.dispatch,
}));

vi.mock("@/pages/TaskListPage/TaskListPage.vue", () => ({
  default: defineComponent({
    setup() {
      return () => h("div");
    },
  }),
}));

function makeTaskList(id: string): TaskList {
  return {
    id,
    system: "simple",
    current: {
      list: "open",
      actionedCount: 0,
      showNext: false,
    },
    tasks: [],
  };
}

async function importFreshRouter() {
  vi.resetModules();
  return (await import("./router.ts")).default;
}

describe("router", () => {
  beforeEach(() => {
    mocks.labels = [];
    mocks.updateTaskListLabels.mockReset();
    mocks.getTaskList.mockReset();
    mocks.dispatch.mockReset();
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    document.title = "";
  });

  it("redirects /tl to the first task list when labels exist", async () => {
    mocks.labels = [{ id: "first", name: "First", position: 0 }];
    mocks.getTaskList.mockResolvedValue(makeTaskList("first"));
    const router = await importFreshRouter();

    await router.push("/tl");

    expect(router.currentRoute.value.fullPath).toBe("/tl/first");
  });

  it("redirects /tl to /tl/new when there are no labels", async () => {
    const router = await importFreshRouter();

    await router.push("/tl");

    expect(router.currentRoute.value.fullPath).toBe("/tl/new");
    expect(document.title).toBe("New list");
  });

  it("redirects unknown task lists to creation with the missing id", async () => {
    mocks.updateTaskListLabels.mockResolvedValue(undefined);
    const router = await importFreshRouter();

    await router.push("/tl/missing");

    expect(mocks.updateTaskListLabels).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.fullPath).toBe("/tl/new/missing");
  });

  it("preloads known task list data and runs cleanup before entering", async () => {
    const taskList = makeTaskList("known");
    mocks.labels = [{ id: "known", name: "Known", position: 0 }];
    mocks.getTaskList.mockResolvedValue(taskList);
    const router = await importFreshRouter();

    await router.push("/tl/known");

    expect(mocks.getTaskList).toHaveBeenCalledWith("known");
    expect(mocks.dispatch).toHaveBeenCalledWith(
      taskList,
      expect.objectContaining({ type: "Cleanup" }),
    );
    expect(router.currentRoute.value.meta.taskListData).toBe(taskList);
  });

  it("uses route props to set the document title from the task list label", async () => {
    mocks.labels = [{ id: "known", name: "Known list", position: 0 }];
    mocks.getTaskList.mockResolvedValue(makeTaskList("known"));
    const router = await importFreshRouter();

    await router.push("/tl/known");
    const routeRecord = router.currentRoute.value.matched[0] as RouteRecordRaw;
    const propsRecord = routeRecord.props as
      | { readonly default: (route: typeof router.currentRoute.value) => unknown }
      | undefined;
    const props = propsRecord?.default;

    expect(typeof props).toBe("function");
    expect(props?.(router.currentRoute.value)).toStrictEqual({ name: "Known list" });
    expect(document.title).toBe("Known list");
  });
});
