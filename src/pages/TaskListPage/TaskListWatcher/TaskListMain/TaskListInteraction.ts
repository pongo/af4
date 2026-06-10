import type { TaskList as TaskListState, UserAction, ViewListType } from "@/app/types.ts";
import type { TaskListViewMode } from "./types.ts";

export type TaskListIntent =
  | {
      readonly type: "submit-new-todo";
      readonly title: string;
      readonly postponed?: boolean;
      readonly origId?: string;
    }
  | { readonly type: "complete-focused" }
  | { readonly type: "delete-focused" }
  | { readonly type: "zero-focused" }
  | { readonly type: "readd-focused" }
  | { readonly type: "toggle-later-for-focused" }
  | { readonly type: "postpone-focused" };

export interface TaskListCommandContext {
  readonly taskList: TaskListState;
  readonly viewList: ViewListType;
  readonly viewMode: TaskListViewMode;
  readonly focusedTaskId: string | null;
}

export type TaskListUiEffect =
  | { readonly type: "focus-new-todo-input" }
  | { readonly type: "notify-task-added-to-open" }
  | { readonly type: "notify-task-added-for-tomorrow" }
  | { readonly type: "notify-task-staged-after-open-actions" }
  | { readonly type: "notify-task-readded-to-open"; readonly taskId?: string }
  | { readonly type: "notify-task-moved-to-later"; readonly taskId: string }
  | { readonly type: "notify-task-postponed-to-tomorrow"; readonly taskId: string };

export interface TaskListCommandResult {
  readonly action?: UserAction;
  readonly effects: {
    readonly beforeDispatch: readonly TaskListUiEffect[];
    readonly afterDispatch: readonly TaskListUiEffect[];
  };
}

const emptyResult: TaskListCommandResult = {
  effects: {
    beforeDispatch: [],
    afterDispatch: [],
  },
};

export function handleTaskListIntent(
  intent: TaskListIntent,
  context: TaskListCommandContext,
): TaskListCommandResult {
  if (intent.type === "submit-new-todo") {
    return handleSubmitNewTodo(intent, context);
  }

  const focusedTask = getFocusedTask(context);
  if (focusedTask === undefined) return emptyResult;

  switch (intent.type) {
    case "complete-focused":
      return withAction({ type: "CompleteTask", id: focusedTask.id });
    case "delete-focused":
      return withAction({ type: "DeleteTask", id: focusedTask.id });
    case "zero-focused":
      return withAction({ type: "ZeroTask", id: focusedTask.id });
    case "readd-focused":
      return withAction(
        { type: "ReaddTask", id: focusedTask.id },
        context.taskList.current.list !== "open"
          ? [{ type: "notify-task-readded-to-open", taskId: focusedTask.id }]
          : [],
      );
    case "toggle-later-for-focused":
      if (context.viewList === "later") {
        return withAction({ type: "ReaddTask", id: focusedTask.id }, [
          { type: "notify-task-readded-to-open", taskId: focusedTask.id },
        ]);
      }
      return withAction({ type: "LaterTask", id: focusedTask.id }, [
        { type: "notify-task-moved-to-later", taskId: focusedTask.id },
      ]);
    case "postpone-focused":
      return withAction({ type: "PostponeTask", id: focusedTask.id }, [
        { type: "notify-task-postponed-to-tomorrow", taskId: focusedTask.id },
      ]);
  }
}

function handleSubmitNewTodo(
  intent: Extract<TaskListIntent, { readonly type: "submit-new-todo" }>,
  context: TaskListCommandContext,
): TaskListCommandResult {
  const action = getSubmitNewTodoAction(intent);
  const notifyEffect = getSubmitNewTodoNotification(context.taskList, intent);
  return {
    action,
    effects: {
      beforeDispatch: [],
      afterDispatch: [
        { type: "focus-new-todo-input" },
        ...(notifyEffect === undefined ? [] : [notifyEffect]),
      ],
    },
  };
}

function getSubmitNewTodoAction(
  intent: Extract<TaskListIntent, { readonly type: "submit-new-todo" }>,
): UserAction {
  const { title, postponed = false, origId } = intent;
  if (postponed) {
    if (origId !== undefined) return { type: "PostponeTask", id: origId, title };
    return { type: "AddPostponedTask", title };
  }
  if (origId !== undefined) return { type: "ReaddTask", id: origId, title };
  return { type: "AddTask", title };
}

function getSubmitNewTodoNotification(
  state: TaskListState,
  { postponed = false }: Extract<TaskListIntent, { readonly type: "submit-new-todo" }>,
): TaskListUiEffect | undefined {
  if (state.system === "af4" || state.system === undefined) {
    if (state.current.list !== "open") {
      return postponed
        ? { type: "notify-task-added-for-tomorrow" }
        : { type: "notify-task-added-to-open" };
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (state.current.list === "open" && state.current.actionedCount > 0) {
      return { type: "notify-task-staged-after-open-actions" };
    }
    return undefined;
  }

  if (postponed) {
    return { type: "notify-task-added-for-tomorrow" };
  }
  return undefined;
}

function getFocusedTask({ taskList, focusedTaskId }: TaskListCommandContext) {
  if (focusedTaskId === null) return undefined;
  return taskList.tasks.find((task) => task.id === focusedTaskId);
}

function withAction(
  action: UserAction,
  afterDispatch: readonly TaskListUiEffect[] = [],
): TaskListCommandResult {
  return {
    action,
    effects: {
      beforeDispatch: [],
      afterDispatch,
    },
  };
}
