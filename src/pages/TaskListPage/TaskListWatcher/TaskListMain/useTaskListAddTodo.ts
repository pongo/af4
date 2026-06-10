import type { TaskList as TaskListState, UserAction } from "@/app/types.ts";

export interface AddTodoOptions {
  readonly postponed?: boolean;
  readonly origId?: string;
}

export function getAddTodoAction(
  title: string,
  { postponed = false, origId }: AddTodoOptions,
): UserAction {
  if (postponed) {
    if (origId !== undefined) return { type: "PostponeTask", id: origId, title };
    return { type: "AddPostponedTask", title };
  }
  if (origId !== undefined) return { type: "ReaddTask", id: origId, title };
  return { type: "AddTask", title };
}

export function getAddTodoNotification(
  state: TaskListState,
  { postponed = false }: AddTodoOptions,
): string | undefined {
  if (state.system === "af4" || state.system === undefined) {
    if (state.current.list !== "open") {
      if (postponed) {
        return "Задача добавлена на завтра";
      }
      return "Задача добавлена в открытый список";
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (state.current.list === "open" && state.current.actionedCount > 0) {
      return "Задача появится после перехода из закрытого списка";
    }
    return undefined;
  }

  if (postponed) {
    return "Задача добавлена на завтра";
  }
  return undefined;
}
