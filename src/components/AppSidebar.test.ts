import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { describe, expect, it, vi } from "vitest";
import AppSidebar from "./AppSidebar.vue";

vi.mock("./NavTaskLists.vue", () => ({
  default: {
    template: "<div data-test='nav-task-lists' />",
  },
}));

vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: {
    props: ["side", "collapsible"],
    template: "<aside :data-side='side' :data-collapsible='collapsible'><slot /></aside>",
  },
  SidebarContent: { template: "<section><slot /></section>" },
  SidebarFooter: { template: "<footer><slot /></footer>" },
  SidebarMenu: { template: "<nav><slot /></nav>" },
  SidebarMenuItem: { template: "<div><slot /></div>" },
  SidebarMenuButton: { template: "<div><slot /></div>" },
}));

vi.mock("vue-router", () => ({
  RouterLink: {
    props: ["to"],
    template: "<a :href='to' @click.prevent><slot /></a>",
  },
}));

vi.mock("@lucide/vue", () => ({
  Plus: { template: "<svg />" },
}));

const SidebarStub = defineComponent({
  props: {
    side: { type: String, default: undefined },
    collapsible: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    return () =>
      h(
        "aside",
        {
          "data-side": props.side,
          "data-collapsible": props.collapsible,
        },
        slots.default?.(),
      );
  },
});

describe("AppSidebar", () => {
  it("renders navigation lists and a new-list link", () => {
    const wrapper = mount(AppSidebar, {
      props: {
        side: "right",
        collapsible: "none",
      },
      global: {
        stubs: {
          Sidebar: SidebarStub,
          SidebarContent: { template: "<section><slot /></section>" },
          SidebarFooter: { template: "<footer><slot /></footer>" },
          SidebarMenu: { template: "<nav><slot /></nav>" },
          SidebarMenuItem: { template: "<div><slot /></div>" },
          SidebarMenuButton: { template: "<div><slot /></div>" },
          NavTaskLists: { template: "<div data-test='nav-task-lists' />" },
          RouterLink: {
            props: ["to"],
            template: "<a :href='to'><slot /></a>",
          },
          Plus: { template: "<svg />" },
        },
      },
    });

    expect(wrapper.find("[data-test='nav-task-lists']").exists()).toBe(true);
    expect(wrapper.find("a").attributes("href")).toBe("/tl/new");
    expect(wrapper.find("aside").attributes("data-side")).toBe("right");
    expect(wrapper.find("aside").attributes("data-collapsible")).toBe("none");
  });
});
