import { describe, expect, it } from "vitest";
import { reactive } from "vue";
import type { Task, TaskList } from "@/app/types.ts";
import { useLaterNewCount } from "./useLaterNewCount.ts";

const createdAt = new Date("2026-06-10T00:00:00.000Z");

function makeTask(id: string, overrides: Partial<Task>): Task {
  return {
    id,
    title: id,
    createdAt,
    status: "new",
    list: "later",
    ...overrides,
  } as Task;
}

function makeTaskList(tasks: Task[] = []): TaskList {
  return reactive({
    id: "task-list",
    system: "simple",
    current: {
      list: "open",
      actionedCount: 0,
      showNext: false,
    },
    tasks,
  });
}

describe("useLaterNewCount", () => {
  it("counts only new tasks in the later list", () => {
    const state = makeTaskList([
      makeTask("later-new", {}),
      makeTask("later-completed", {
        status: "completed",
        completedAt: createdAt,
      }),
      makeTask("open-new", { list: "open" }),
    ]);

    const { laterNewCount } = useLaterNewCount(state);

    expect(laterNewCount.value).toBe(1);
  });

  it.each([
    [1, "1 задача в списке «когда-нибудь»"],
    [2, "2 задачи в списке «когда-нибудь»"],
    [5, "5 задач в списке «когда-нибудь»"],
    [21, "21 задача в списке «когда-нибудь»"],
  ])("formats Russian plural text for %i task(s)", (count, expected) => {
    const state = makeTaskList(
      Array.from({ length: count }, (_, index) => makeTask(`later-${index}`, {})),
    );

    const { laterNewCountText } = useLaterNewCount(state);

    expect(laterNewCountText.value).toBe(expected);
  });
});
