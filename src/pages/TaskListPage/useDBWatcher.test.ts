import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref, type Ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDBWatcher } from "./useDBWatcher.ts";

const mocks = vi.hoisted(() => ({
  dbChangedData: undefined as
    | Ref<
        | { readonly id: string; readonly type: "change" | "delete"; readonly storeName: string }
        | undefined
      >
    | undefined,
  routerPush: vi.fn(),
  routerGo: vi.fn(),
}));

vi.mock("@/app/db.ts", async () => {
  const vue = await vi.importActual<typeof import("vue")>("vue");
  mocks.dbChangedData = vue.ref();

  return {
    db: {
      dbChangedData: mocks.dbChangedData,
    },
  };
});

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    go: mocks.routerGo,
  }),
}));

let wrapper: ReturnType<typeof mount> | undefined;

function mountHarness(id = "current") {
  wrapper = mount(
    defineComponent({
      setup() {
        useDBWatcher(ref(id));
        return () => h("div");
      },
    }),
  );
}

describe("useDBWatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const dbChangedData = mocks.dbChangedData;
    if (dbChangedData === undefined) throw new Error("dbChangedData was not initialized");
    dbChangedData.value = undefined;
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("redirects home when the current task list label is deleted", async () => {
    mountHarness();

    const dbChangedData = mocks.dbChangedData;
    if (dbChangedData === undefined) throw new Error("dbChangedData was not initialized");
    dbChangedData.value = {
      id: "current",
      type: "delete",
      storeName: "tasklists_meta",
    };
    await nextTick();

    expect(mocks.routerPush).toHaveBeenCalledWith("/");
  });

  it("reloads the current route when current task list data changes", async () => {
    mountHarness();

    const dbChangedData = mocks.dbChangedData;
    if (dbChangedData === undefined) throw new Error("dbChangedData was not initialized");
    dbChangedData.value = {
      id: "current",
      type: "change",
      storeName: "tasklists_data",
    };
    await nextTick();

    expect(mocks.routerGo).toHaveBeenCalledWith(0);
  });

  it("ignores changes for other task lists", async () => {
    mountHarness();

    const dbChangedData = mocks.dbChangedData;
    if (dbChangedData === undefined) throw new Error("dbChangedData was not initialized");
    dbChangedData.value = {
      id: "other",
      type: "delete",
      storeName: "tasklists_meta",
    };
    await nextTick();

    expect(mocks.routerPush).not.toHaveBeenCalled();
    expect(mocks.routerGo).not.toHaveBeenCalled();
  });
});
