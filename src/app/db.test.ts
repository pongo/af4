import { flushPromises } from "@vue/test-utils";
import { type ShallowRef } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import type { TaskList } from "./types.ts";

const broadcast = vi.hoisted(() => ({
  post: vi.fn(),
  data: undefined as
    | ShallowRef<{ readonly storeName: string; readonly type: "change" } | undefined>
    | undefined,
}));

vi.mock("@vueuse/core", async () => {
  const vue = await vi.importActual<typeof import("vue")>("vue");
  broadcast.data = vue.shallowRef(undefined);

  return {
    useBroadcastChannel: () => ({
      data: broadcast.data,
      post: broadcast.post,
    }),
  };
});

function makeTaskList(id: string): TaskList {
  return {
    id,
    system: "simple",
    current: {
      list: "open",
      actionedCount: 0,
      showNext: false,
    },
    tasks: [
      {
        id: `${id}-task`,
        title: "Task",
        createdAt: new Date("2026-06-10T00:00:00.000Z"),
        status: "new",
        list: "open",
      },
    ],
  };
}

async function importFreshDb() {
  vi.resetModules();
  globalThis.indexedDB = new IDBFactory();
  globalThis.IDBKeyRange = IDBKeyRange;
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: undefined,
  });
  broadcast.post.mockClear();

  return await import("./db.ts");
}

describe("db", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("adds task lists with labels ordered by position", async () => {
    const { db } = await importFreshDb();
    const first = makeTaskList("first");
    const second = makeTaskList("second");

    await db.addTaskList("First", first);
    await db.addTaskList("Second", second);

    await expect(db.getTaskList("first")).resolves.toStrictEqual(first);
    await expect(db.getTaskList("second")).resolves.toStrictEqual(second);
    await expect(db.getTaskListLabels()).resolves.toStrictEqual([
      { id: "first", name: "First", position: 0 },
      { id: "second", name: "Second", position: 1 },
    ]);
    expect(broadcast.post).toHaveBeenCalledWith({ type: "change", storeName: "tasklists_meta" });
    expect(broadcast.post).toHaveBeenCalledWith({ type: "change", storeName: "tasklists_data" });
  });

  it("saves and retrieves a task list by id", async () => {
    const { db } = await importFreshDb();
    const taskList = makeTaskList("saved");

    await db.saveTaskList(taskList);

    await expect(db.getTaskList("saved")).resolves.toStrictEqual(taskList);
    expect(broadcast.post).toHaveBeenCalledWith({
      type: "change",
      storeName: "tasklists_data",
      id: "saved",
    });
  });

  it("throws when a task list is missing", async () => {
    const { db } = await importFreshDb();

    await expect(db.getTaskList("missing")).rejects.toThrow("No state found");
  });

  it("reorders task list labels and refreshes the exported ref", async () => {
    const { db, taskListLabels } = await importFreshDb();

    await db.addTaskList("First", makeTaskList("first"));
    await db.addTaskList("Second", makeTaskList("second"));
    await db.addTaskList("Third", makeTaskList("third"));
    broadcast.post.mockClear();

    await db.reorderTaskListLabels(["third", "first"]);

    expect(taskListLabels.value).toStrictEqual([
      { id: "third", name: "Third", position: 0 },
      { id: "first", name: "First", position: 1 },
      { id: "second", name: "Second", position: 1 },
    ]);
    expect(broadcast.post).toHaveBeenCalledWith({ type: "change", storeName: "tasklists_meta" });
  });

  it("renames task list labels and refreshes the exported ref", async () => {
    const { db, taskListLabels } = await importFreshDb();

    await db.addTaskList("Original", makeTaskList("list"));
    broadcast.post.mockClear();

    await db.updateTaskListLabel("list", "Renamed");

    expect(taskListLabels.value).toStrictEqual([{ id: "list", name: "Renamed", position: 0 }]);
    expect(broadcast.post).toHaveBeenCalledWith({ type: "change", storeName: "tasklists_meta" });
  });

  it("deletes task list data and label", async () => {
    const { db, taskListLabels } = await importFreshDb();

    await db.addTaskList("List", makeTaskList("list"));
    broadcast.post.mockClear();

    await db.deleteTaskList("list");

    await expect(db.getTaskList("list")).rejects.toThrow("No state found");
    expect(taskListLabels.value).toStrictEqual([]);
    expect(broadcast.post).toHaveBeenCalledWith({
      type: "delete",
      storeName: "tasklists_meta",
      id: "list",
    });
    expect(broadcast.post).toHaveBeenCalledWith({
      type: "delete",
      storeName: "tasklists_data",
      id: "list",
    });
  });

  it("updates labels when a meta broadcast is received", async () => {
    const { db, taskListLabels } = await importFreshDb();

    await db.addTaskList("List", makeTaskList("list"));
    taskListLabels.value = [];

    expect(broadcast.data).toBeDefined();
    const data = broadcast.data;
    if (data === undefined) throw new Error("Broadcast data ref was not initialized");
    data.value = { type: "change", storeName: "tasklists_meta" };
    await flushPromises();

    expect(taskListLabels.value).toStrictEqual([{ id: "list", name: "List", position: 0 }]);
  });
});

describe("requestPersistentStorage", () => {
  it("does nothing when persistent storage is unavailable", async () => {
    const { requestPersistentStorage } = await importFreshDb();

    await expect(requestPersistentStorage()).resolves.toBeUndefined();
  });

  it("requests persistent storage when it is not already granted", async () => {
    const { requestPersistentStorage } = await importFreshDb();
    const persisted = vi.fn().mockResolvedValue(false);
    const persist = vi.fn().mockResolvedValue(true);

    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { persisted, persist },
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await requestPersistentStorage();

    expect(persisted).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledOnce();
  });
});
