import { mount } from "@vue/test-utils";
import { nextTick, ref, type Component } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NavTaskLists from "./NavTaskLists.vue";

const mocks = vi.hoisted(() => ({
  labels: undefined as
    | ReturnType<typeof ref<{ id: string; name: string; position: number }[]>>
    | undefined,
  reorderLabels: vi.fn(),
  renameTaskListLabel: vi.fn(),
  deleteTaskList: vi.fn(),
  routerPush: vi.fn(),
  route: {
    params: { id: "second" },
  },
  sortableOnEnd: undefined as
    | ((event: { oldIndex?: number; newIndex?: number }) => void)
    | undefined,
}));

vi.mock("@/app/lib/taskListLabelsStore", async () => {
  const vue = await vi.importActual<typeof import("vue")>("vue");
  mocks.labels = vue.ref([
    { id: "first", name: "First", position: 0 },
    { id: "second", name: "Second", position: 1 },
  ]);

  return {
    taskListLabelsStore: () => ({
      taskListLabels: mocks.labels,
      reorderLabels: mocks.reorderLabels,
      renameTaskListLabel: mocks.renameTaskListLabel,
    }),
  };
});

vi.mock("@/app/db.ts", () => ({
  db: {
    deleteTaskList: mocks.deleteTaskList,
  },
}));

vi.mock("vue-router", async () => {
  const vue = await vi.importActual<typeof import("vue")>("vue");
  const RouterLink = vue.defineComponent({
    props: {
      to: { type: String, required: true },
      title: { type: String, default: undefined },
    },
    template: "<a :href='to' :title='title' @click.prevent><slot /></a>",
  });

  return {
    RouterLink,
    useRoute: () => mocks.route,
    useRouter: () => ({
      push: mocks.routerPush,
    }),
  };
});

vi.mock("@vueuse/integrations/useSortable", () => ({
  useSortable: (
    _el: unknown,
    _list: unknown,
    options: { readonly onEnd?: (event: { oldIndex?: number; newIndex?: number }) => void },
  ) => {
    mocks.sortableOnEnd = options.onEnd;
  },
}));

function passthrough(name: string): Component {
  return {
    name,
    template: `<div><slot /></div>`,
  };
}

vi.mock("@/components/ui/sidebar", () => ({
  SidebarGroup: passthrough("SidebarGroup"),
  SidebarGroupLabel: passthrough("SidebarGroupLabel"),
  SidebarMenu: passthrough("SidebarMenu"),
  SidebarMenuAction: passthrough("SidebarMenuAction"),
  SidebarMenuButton: passthrough("SidebarMenuButton"),
  SidebarMenuItem: passthrough("SidebarMenuItem"),
  useSidebar: () => ({
    isMobile: ref(false),
  }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: passthrough("DropdownMenu"),
  DropdownMenuContent: passthrough("DropdownMenuContent"),
  DropdownMenuTrigger: passthrough("DropdownMenuTrigger"),
  DropdownMenuItem: {
    name: "DropdownMenuItem",
    template: `<button type="button"><slot /></button>`,
  },
}));

function labelsRef() {
  const labels = mocks.labels;
  if (labels === undefined) throw new Error("Labels ref was not initialized");
  return labels;
}

function mountNavTaskLists() {
  return mount(NavTaskLists, {
    global: {
      mocks: {
        $route: mocks.route,
      },
    },
  });
}

describe("NavTaskLists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    labelsRef().value = [
      { id: "first", name: "First", position: 0 },
      { id: "second", name: "Second", position: 1 },
    ];
    mocks.route.params = { id: "second" };
    mocks.sortableOnEnd = undefined;
    document.title = "";
  });

  it("renders task list labels as links", () => {
    const wrapper = mountNavTaskLists();

    const links = wrapper.findAll("a");

    expect(links.map((link) => link.text())).toStrictEqual(["First", "Second"]);
    expect(links.map((link) => link.attributes("href"))).toStrictEqual(["/tl/first", "/tl/second"]);
  });

  it("updates the document title when a list link is clicked", async () => {
    const wrapper = mountNavTaskLists();

    await wrapper.findAll("a")[0].trigger("click");

    expect(document.title).toBe("First");
  });

  it("renames a task list when prompt returns a new non-empty name", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(" Renamed ");
    const wrapper = mountNavTaskLists();

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Rename"))
      ?.trigger("click");

    expect(mocks.renameTaskListLabel).toHaveBeenCalledWith("first", "Renamed");
  });

  it("does not rename when prompt is cancelled", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(null);
    const wrapper = mountNavTaskLists();

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Rename"))
      ?.trigger("click");

    expect(mocks.renameTaskListLabel).not.toHaveBeenCalled();
  });

  it("deletes a task list after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = mountNavTaskLists();

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Delete"))
      ?.trigger("click");

    expect(mocks.deleteTaskList).toHaveBeenCalledWith("first");
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });

  it("redirects home after deleting the current task list", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = mountNavTaskLists();
    const deleteButtons = wrapper
      .findAll("button")
      .filter((button) => button.text().includes("Delete"));

    await deleteButtons[1].trigger("click");

    expect(mocks.deleteTaskList).toHaveBeenCalledWith("second");
    expect(mocks.routerPush).toHaveBeenCalledWith("/");
  });

  it("does not delete when confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const wrapper = mountNavTaskLists();

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Delete"))
      ?.trigger("click");

    expect(mocks.deleteTaskList).not.toHaveBeenCalled();
  });

  it("persists reordered labels after sortable changes their order", async () => {
    mountNavTaskLists();
    labelsRef().value = [
      { id: "second", name: "Second", position: 1 },
      { id: "first", name: "First", position: 0 },
    ];

    mocks.sortableOnEnd?.({ oldIndex: 0, newIndex: 1 });
    await nextTick();

    expect(mocks.reorderLabels).toHaveBeenCalledWith(["second", "first"]);
  });

  it("ignores sortable events that do not change the index", async () => {
    mountNavTaskLists();

    mocks.sortableOnEnd?.({ oldIndex: 1, newIndex: 1 });
    await nextTick();

    expect(mocks.reorderLabels).not.toHaveBeenCalled();
  });
});
