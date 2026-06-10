import { mount } from "@vue/test-utils";
import { computed, defineComponent, h, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { Task, TaskList } from "@/app/types.ts";
import { useTaskListHotkeys } from "./useTaskListHotkeys.ts";

function makeTask(id: string): Task {
  return {
    id,
    title: "Task",
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    status: "new",
    list: "closed",
  };
}

function makeTaskList(task: Task): TaskList {
  return {
    id: "task-list",
    system: "af4",
    current: {
      list: "closed",
      actionedCount: 0,
      showNext: false,
      willBeMarkedForReview: false,
    },
    tasks: [task],
  };
}

describe("useTaskListHotkeys", () => {
  it("dispatches task actions to the latest state after the state object is replaced", async () => {
    const originalState = makeTaskList(makeTask("task"));
    const latestState = makeTaskList(makeTask("task"));
    const stateRef = ref(originalState);

    const Harness = defineComponent({
      setup() {
        useTaskListHotkeys({
          state: () => stateRef.value,
          viewMode: ref("current"),
          viewList: computed(() => "closed"),
          newTodoFormRef: {
            value: {
              focus: vi.fn(),
              focusWithText: vi.fn(),
            },
          },
          taskListRef: {
            value: {
              navigate: vi.fn(),
              getFocusedTask: () => stateRef.value.tasks[0],
              getFocusedItem: () => undefined,
            },
          },
          notify: vi.fn(),
          next: vi.fn(),
          toggleLaterView: vi.fn(),
          undo: vi.fn(),
          redo: vi.fn(),
        });

        return () => h("div");
      },
    });

    const wrapper = mount(Harness);
    stateRef.value = latestState;

    const taskElement = document.createElement("div");
    taskElement.dataset.id = "task";
    document.body.append(taskElement);
    taskElement.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "r" }));
    await wrapper.vm.$nextTick();

    expect(latestState.tasks).toHaveLength(2);
    expect(originalState.tasks).toHaveLength(1);

    taskElement.remove();
    wrapper.unmount();
  });
});
