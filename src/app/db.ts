import type { TaskList } from "@/app/types";
import { useBroadcastChannel } from "@vueuse/core";
import { openDB, type IDBPDatabase } from "idb";
import { assert } from "smart-invariant";
import { shallowRef, watch } from "vue";

export interface TaskListLabel {
  id: string;
  name: string;
  position: number;
}

const DB_NAME = "af4-db";
const DB_VERSION = 1;

export const taskListLabels = shallowRef<TaskListLabel[]>([]);

export interface dbChangedData {
  storeName: string;
  type: "change" | "delete";
  id?: string;
}

const { data: dbChangedData, post: postMessage } = useBroadcastChannel<
  dbChangedData,
  dbChangedData
>({
  name: "af4-db-changes",
});

watch(dbChangedData, async (data) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  assert(data != undefined);
  if (data.storeName === "tasklists_meta") {
    await db.updateTaskListLabels();
  }
});

function notifyChange(storeName: string, type: "change" | "delete" = "change", id?: string) {
  postMessage({ type, storeName, id });
}

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("tasklists_meta")) {
      const metaStore = db.createObjectStore("tasklists_meta", { keyPath: "id" });
      metaStore.createIndex("position", "position");
    }
    if (!db.objectStoreNames.contains("tasklists_data")) {
      db.createObjectStore("tasklists_data", { keyPath: "id" });
    }
  },
  blocked() {
    console.warn("Database upgrade is blocked by another tab.");
  },
  blocking() {
    console.warn("This tab is blocking a database upgrade. Closing...");
    void dbPromise.then((db) => {
      db.close();
    });
    alert("Application updated in another tab. This tab will now reload.");
    location.reload();
  },
  terminated() {
    console.error("Database connection terminated unexpectedly.");
  },
});

export const db = {
  dbChangedData,

  async saveTaskList(taskList: TaskList): Promise<void> {
    const idb = await dbPromise;
    // IndexedDB supports structured clone, so we can save the object directly.
    // This preserves Date objects.
    await idb.put("tasklists_data", taskList);
    notifyChange("tasklists_data", "change", taskList.id);
  },

  async getTaskList(id: string): Promise<TaskList> {
    const idb = await dbPromise;
    const savedState = await idb.get("tasklists_data", id);
    if (!savedState) {
      throw new Error("No state found");
    }
    // Deep clone and revive dates because idb doesn't store Dates directly as Objects in some cases?
    // Actually IDB supports Date objects, but let's be safe if they come from JSON.
    // If they were saved as Objects, they should be fine.
    // However, TaskList in types.ts has Dates.
    return savedState as TaskList;
  },

  async addTaskList(name: string, taskList: TaskList): Promise<void> {
    const idb = await dbPromise;
    await idb.put("tasklists_data", taskList);
    await addTaskListLabel(idb, name, taskList.id);
    notifyChange("tasklists_data");
  },

  /**
   * Returns labels sorted by position
   */
  async getTaskListLabels(): Promise<TaskListLabel[]> {
    const idb = await dbPromise;
    // Use the index to get them sorted by position
    return await idb.getAllFromIndex("tasklists_meta", "position");
  },

  async reorderTaskListLabels(orderedIds: string[]): Promise<void> {
    const idb = await dbPromise;
    const tx = idb.transaction("tasklists_meta", "readwrite");
    const store = tx.objectStore("tasklists_meta");

    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      const label = await store.get(id);
      if (label) {
        label.position = i;
        await store.put(label);
      }
    }
    await tx.done;
    await db.updateTaskListLabels();
    notifyChange("tasklists_meta");
  },

  async updateTaskListLabel(id: string, name: string): Promise<void> {
    const idb = await dbPromise;
    const tx = idb.transaction("tasklists_meta", "readwrite");
    const store = tx.objectStore("tasklists_meta");
    const label = await store.get(id);
    if (label) {
      label.name = name;
      await store.put(label);
    }
    await tx.done;
    await db.updateTaskListLabels();
    notifyChange("tasklists_meta");
  },

  async deleteTaskList(id: string): Promise<void> {
    const idb = await dbPromise;
    const tx = idb.transaction(["tasklists_meta", "tasklists_data"], "readwrite");
    await tx.objectStore("tasklists_meta").delete(id);
    await tx.objectStore("tasklists_data").delete(id);
    await tx.done;
    await db.updateTaskListLabels();
    notifyChange("tasklists_meta", "delete", id);
    notifyChange("tasklists_data", "delete", id);
  },

  async updateTaskListLabels(): Promise<void> {
    taskListLabels.value = await db.getTaskListLabels();
  },
};

export async function requestPersistentStorage(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (navigator.storage?.persist) {
    const isPersisted = await navigator.storage.persisted();
    console.log(`Persisted storage granted: ${isPersisted}`);
    if (!isPersisted) {
      const granted = await navigator.storage.persist();
      console.log(`Persisted storage request result: ${granted}`);
    }
  }
}

async function addTaskListLabel(idb: IDBPDatabase, name: string, id: string): Promise<void> {
  const labels = await db.getTaskListLabels();
  // labels are sorted by position
  const position = labels.length > 0 ? labels[labels.length - 1].position + 1 : 0;
  const newLabel = { id, name, position };
  await idb.put("tasklists_meta", newLabel);
  notifyChange("tasklists_meta");
}
