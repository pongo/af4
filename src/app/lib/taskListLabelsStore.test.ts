import { beforeEach, describe, expect, it, vi } from "vitest";
import { shallowRef } from "vue";
import { taskListLabelsStore } from "./taskListLabelsStore.ts";

const mocks = vi.hoisted(() => ({
  updateTaskListLabel: vi.fn(),
  reorderTaskListLabels: vi.fn(),
}));

vi.mock("@/app/db", () => ({
  taskListLabels: shallowRef([
    { id: "first", name: "First", position: 0 },
    { id: "second", name: "Second", position: 1 },
    { id: "third", name: "Third", position: 2 },
  ]),
  db: {
    reorderTaskListLabels: mocks.reorderTaskListLabels,
    updateTaskListLabel: mocks.updateTaskListLabel,
  },
}));

describe("taskListLabelsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("looks up a task list label by id", () => {
    const store = taskListLabelsStore();

    expect(store.getTaskListLabel("second")).toStrictEqual({
      id: "second",
      name: "Second",
      position: 1,
    });
    expect(store.getTaskListLabel("missing")).toBeUndefined();
  });

  it("navigates to adjacent labels by direction", () => {
    const store = taskListLabelsStore();

    expect(store.navigateToNextList("second", "up")).toBe("first");
    expect(store.navigateToNextList("second", "down")).toBe("third");
    expect(store.navigateToNextList("first", "up")).toBeUndefined();
    expect(store.navigateToNextList("third", "down")).toBeUndefined();
    expect(store.navigateToNextList("missing", "down")).toBeUndefined();
  });

  it("navigates labels by zero-based index", () => {
    const store = taskListLabelsStore();

    expect(store.navigateListByIndex(0)).toBe("first");
    expect(store.navigateListByIndex(2)).toBe("third");
    expect(store.navigateListByIndex(-1)).toBeUndefined();
    expect(store.navigateListByIndex(3)).toBeUndefined();
  });

  it("forwards reorder and rename operations to db", async () => {
    const store = taskListLabelsStore();

    await store.reorderLabels(["third", "first"]);
    await store.renameTaskListLabel("second", "Renamed");

    expect(mocks.reorderTaskListLabels).toHaveBeenCalledWith(["third", "first"]);
    expect(mocks.updateTaskListLabel).toHaveBeenCalledWith("second", "Renamed");
  });
});
