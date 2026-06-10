import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateNewTaskListPage from "./CreateNewTaskListPage.vue";

const mocks = vi.hoisted(() => ({
  route: {
    params: {} satisfies { id?: string },
  },
  routerPush: vi.fn(),
  addTaskList: vi.fn(),
  requestPersistentStorage: vi.fn(),
  nanoid: vi.fn(() => "generated-id"),
}));

vi.mock("vue-router", () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({
    push: mocks.routerPush,
  }),
}));

vi.mock("nanoid", () => ({
  nanoid: mocks.nanoid,
}));

vi.mock("@/app/db.ts", () => ({
  db: {
    addTaskList: mocks.addTaskList,
  },
  requestPersistentStorage: mocks.requestPersistentStorage,
}));

describe("CreateNewTaskListPage", () => {
  beforeEach(() => {
    mocks.route.params = {};
    mocks.routerPush.mockReset();
    mocks.addTaskList.mockReset();
    mocks.requestPersistentStorage.mockReset();
    mocks.nanoid.mockClear();
    mocks.nanoid.mockReturnValue("generated-id");
  });

  it("uses simple as the default system", () => {
    const wrapper = mount(CreateNewTaskListPage);

    expect((wrapper.find("select").element as HTMLSelectElement).value).toBe("simple");
  });

  it("creates a new simple task list with a generated id", async () => {
    const wrapper = mount(CreateNewTaskListPage);

    await wrapper.find("input").setValue("Inbox");
    await wrapper.find("form").trigger("submit");

    expect(mocks.addTaskList).toHaveBeenCalledWith("Inbox", {
      id: "generated-id",
      system: "simple",
      tasks: [],
      current: {
        list: "open",
        actionedCount: 0,
        showNext: false,
      },
    });
    expect(mocks.requestPersistentStorage).toHaveBeenCalledOnce();
    expect(mocks.routerPush).toHaveBeenCalledWith("/tl/generated-id");
  });

  it("uses the route id when creating a task list from a missing route", async () => {
    mocks.route.params = { id: "from-route" };
    const wrapper = mount(CreateNewTaskListPage);

    await wrapper.find("input").setValue("Recovered");
    await wrapper.find("select").setValue("af4");
    await wrapper.find("form").trigger("submit");

    expect(mocks.nanoid).not.toHaveBeenCalled();
    expect(mocks.addTaskList).toHaveBeenCalledWith(
      "Recovered",
      expect.objectContaining({
        id: "from-route",
        system: "af4",
      }),
    );
    expect(mocks.routerPush).toHaveBeenCalledWith("/tl/from-route");
  });

  it("does not submit an empty name", async () => {
    const wrapper = mount(CreateNewTaskListPage);

    await wrapper.find("input").setValue("   ");
    await wrapper.find("form").trigger("submit");

    expect(mocks.addTaskList).not.toHaveBeenCalled();
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });

  it("returns home on Escape", async () => {
    const wrapper = mount(CreateNewTaskListPage);

    await wrapper.find("input").trigger("keyup", { key: "Escape" });

    expect(mocks.routerPush).toHaveBeenCalledWith("/tl");
  });
});
