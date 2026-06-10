import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNavigationHotkeys } from "./useNavigationHotkeys.ts";

const routerReplace = vi.fn();
const route = reactive<{ params: { id?: string } }>({ params: { id: "second" } });
const navigateToNextList = vi.fn();
const navigateListByIndex = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({
    replace: routerReplace,
  }),
  useRoute: () => route,
}));

vi.mock("../lib/taskListLabelsStore", () => ({
  taskListLabelsStore: () => ({
    navigateToNextList,
    navigateListByIndex,
  }),
}));

function mountHarness() {
  return mount(
    defineComponent({
      setup() {
        useNavigationHotkeys();
        return () => h("div");
      },
    }),
  );
}

function keydown(key: string, options: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...options }));
}

describe("useNavigationHotkeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params.id = "second";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("navigates to the previous and next task list with q and a", async () => {
    navigateToNextList.mockImplementation((id: string, direction: "up" | "down") =>
      direction === "up" ? `${id}-prev` : `${id}-next`,
    );
    const wrapper = mountHarness();

    keydown("q");
    keydown("a");
    await nextTick();

    expect(navigateToNextList).toHaveBeenNthCalledWith(1, "second", "up");
    expect(navigateToNextList).toHaveBeenNthCalledWith(2, "second", "down");
    expect(routerReplace).toHaveBeenNthCalledWith(1, "/tl/second-prev");
    expect(routerReplace).toHaveBeenNthCalledWith(2, "/tl/second-next");

    wrapper.unmount();
  });

  it("navigates by Alt+digit using zero-based label indexes", async () => {
    navigateListByIndex.mockImplementation((index: number) => `list-${index}`);
    const wrapper = mountHarness();

    keydown("1", { altKey: true });
    keydown("0", { altKey: true });
    await nextTick();

    expect(navigateListByIndex).toHaveBeenNthCalledWith(1, 0);
    expect(navigateListByIndex).toHaveBeenNthCalledWith(2, 9);
    expect(routerReplace).toHaveBeenNthCalledWith(1, "/tl/list-0");
    expect(routerReplace).toHaveBeenNthCalledWith(2, "/tl/list-9");

    wrapper.unmount();
  });

  it("does not navigate when the store has no target id", async () => {
    navigateToNextList.mockReturnValue(undefined);
    navigateListByIndex.mockReturnValue(undefined);
    const wrapper = mountHarness();

    keydown("q");
    keydown("9", { altKey: true });
    await nextTick();

    expect(routerReplace).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it("does not navigate by direction when current route has no id", async () => {
    route.params.id = undefined;
    const wrapper = mountHarness();

    keydown("q");
    await nextTick();

    expect(navigateToNextList).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});
