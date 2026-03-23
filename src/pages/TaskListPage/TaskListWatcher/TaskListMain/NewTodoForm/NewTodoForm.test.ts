import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import NewTodoForm from "./NewTodoForm.vue";

describe("NewTodoForm", () => {
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
