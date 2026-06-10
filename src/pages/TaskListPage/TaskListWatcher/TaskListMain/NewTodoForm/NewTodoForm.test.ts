import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import NewTodoForm from "./NewTodoForm.vue";

describe("NewTodoForm", () => {
  it("does not emit add-todo for empty input", async () => {
    const wrapper = mount(NewTodoForm);

    await wrapper.find("input").trigger("keyup", { key: "Enter" });
    await wrapper.find("button").trigger("click");

    expect(wrapper.emitted("add-todo")).toBeUndefined();
  });

  it("emits ordinary add-todo on Enter and resets the input", async () => {
    const wrapper = mount(NewTodoForm);
    const input = wrapper.find("input");

    await input.setValue("New Task");
    await input.trigger("keyup", { key: "Enter", shiftKey: false });

    expect(wrapper.emitted("add-todo")).toStrictEqual([
      ["New Task", { postponed: false, origId: undefined }],
    ]);
    expect((input.element as HTMLInputElement).value).toBe("");
  });

  it("keeps origId when submitting text prepared with focusWithText", async () => {
    const wrapper = mount(NewTodoForm);
    const vm = wrapper.vm as unknown as {
      focusWithText: (text: string, options: { origId?: string }) => void;
    };

    vm.focusWithText("Existing Task", { origId: "task" });
    await wrapper.find("input").trigger("keyup", { key: "Enter", shiftKey: false });

    expect(wrapper.emitted("add-todo")).toStrictEqual([
      ["Existing Task", { postponed: false, origId: "task" }],
    ]);
  });

  it("resets prepared text and origId on Escape", async () => {
    const wrapper = mount(NewTodoForm);
    const vm = wrapper.vm as unknown as {
      focusWithText: (text: string, options: { origId?: string }) => void;
    };

    vm.focusWithText("Existing Task", { origId: "task" });
    await wrapper.find("input").trigger("keyup", { key: "Escape" });
    await wrapper.find("input").trigger("keyup", { key: "Enter" });

    expect(wrapper.emitted("add-todo")).toBeUndefined();
  });

  it("emits focus-task when Space is pressed on an empty input", async () => {
    const wrapper = mount(NewTodoForm);

    await wrapper.find("input").trigger("keydown", { key: " " });

    expect(wrapper.emitted("focus-task")).toHaveLength(1);
  });

  describe("postponed", () => {
    function createWrapper() {
      const wrapper = mount(NewTodoForm);

      const vm = wrapper.vm as unknown as {
        focusWithText: (text: string, options: { postponed?: boolean }) => void;
      };
      vm.focusWithText("New Task", { postponed: true });

      return wrapper;
    }

    it("should emit add-todo with postponed: true when component state is postponed but shiftKey is false", async () => {
      const wrapper = createWrapper();

      const input = wrapper.find("input");
      await input.setValue("New Task edited");
      await input.trigger("keyup", { key: "Enter", shiftKey: false });

      const emitted = wrapper.emitted("add-todo");
      expect(emitted).toBeDefined();
      const payload = emitted ? emitted[0] : [];

      expect(payload[0]).toBe("New Task edited");
      expect(payload[1]).toMatchObject({
        postponed: true,
      });
    });

    it("should emit add-todo with postponed: true when shiftKey is true (even if component state is not postponed)", async () => {
      const wrapper = createWrapper();

      const input = wrapper.find("input");
      await input.trigger("keyup", { key: "Enter", shiftKey: true });

      const emitted = wrapper.emitted("add-todo");
      expect(emitted).toBeDefined();
      const payload = emitted ? emitted[0] : [];

      expect(payload[0]).toBe("New Task");
      expect(payload[1]).toMatchObject({
        postponed: true,
      });
    });
  });
});
