import { nextTick, onMounted, onUnmounted, toValue, type ComputedRef, type Ref } from "vue";
import { keysHandlerBuilder } from "bind-keys";
import type { Task, TaskList as TaskListState, ViewListType } from "@/app/types.ts";
import type { TaskListViewMode } from "./types.ts";
import {
  handleTaskListIntent,
  type TaskListCommandResult,
  type TaskListIntent,
} from "./TaskListInteraction.ts";

interface ComponentRef<T> {
  readonly value: T | null;
}

interface NewTodoFormComponent {
  focus: () => void;
  focusWithText: (
    text: string,
    options?: { readonly postponed?: boolean; readonly origId?: string },
  ) => void;
}

interface TaskListItemComponent {
  openFirstLink: () => void;
  edit: () => string | undefined;
  focus: () => void;
}

interface TaskListComponent {
  navigate: (direction: "up" | "down" | "home" | "end" | "pageup" | "pagedown") => void;
  getFocusedTask: () => Task | undefined;
  getFocusedItem: () => TaskListItemComponent | undefined;
}

interface UseTaskListHotkeysOptions {
  readonly state: () => TaskListState;
  readonly viewMode: Ref<TaskListViewMode>;
  readonly viewList: ComputedRef<ViewListType>;
  readonly newTodoFormRef: ComponentRef<NewTodoFormComponent>;
  readonly taskListRef: ComponentRef<TaskListComponent>;
  readonly executeCommand: (result: TaskListCommandResult) => void;
  readonly next: () => void;
  readonly toggleLaterView: () => void;
  readonly undo: () => void;
  readonly redo: () => void;
}

export function useTaskListHotkeys({
  state,
  viewMode,
  viewList,
  newTodoFormRef,
  taskListRef,
  executeCommand,
  next,
  toggleLaterView,
  undo,
  redo,
}: UseTaskListHotkeysOptions) {
  function getState() {
    return toValue(state);
  }

  function getFocusedTaskId(event: KeyboardEvent) {
    const id = (event.target as HTMLElement).dataset.id;
    if (id !== undefined) {
      return id;
    }
    const focusedTask = taskListRef.value?.getFocusedTask();
    return focusedTask !== undefined ? focusedTask.id : undefined;
  }

  function executeIntent(intent: TaskListIntent, focusedTaskId: string | null) {
    executeCommand(
      handleTaskListIntent(intent, {
        taskList: getState(),
        viewList: viewList.value,
        viewMode: viewMode.value,
        focusedTaskId,
      }),
    );
  }

  const bindKeysHandler = keysHandlerBuilder()
    .add(
      ["space", "c", "n"],
      () => {
        newTodoFormRef.value?.focus();
      },
      { filterInput: true, prevent: true },
    )
    .add(
      ["up", "w", "j"],
      () => {
        taskListRef.value?.navigate("up");
      },
      { filterInput: true, prevent: true },
    )
    .add(
      ["down", "s", "k"],
      () => {
        taskListRef.value?.navigate("down");
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "home",
      () => {
        taskListRef.value?.navigate("home");
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "end",
      () => {
        taskListRef.value?.navigate("end");
      },
      { filterInput: true, prevent: true },
    )
    .add(
      ["pageup", "pgup"],
      () => {
        taskListRef.value?.navigate("pageup");
      },
      { filterInput: true, prevent: true },
    )
    .add(
      ["pagedown", "pgdown"],
      () => {
        taskListRef.value?.navigate("pagedown");
      },
      { filterInput: true, prevent: true },
    )
    .add(
      ["x", "d"],
      (event) => {
        executeIntent({ type: "complete-focused" }, getFocusedTaskId(event) ?? null);
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "shift+x",
      () => {
        viewMode.value = viewMode.value === "completed" ? "current" : "completed";
        void nextTick(() => {
          taskListRef.value?.navigate("home");
        });
      },
      { filterInput: true, prevent: true },
    )
    .add(
      ["delete", "backspace"],
      (event) => {
        executeIntent({ type: "delete-focused" }, getFocusedTaskId(event) ?? null);
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "shift+z",
      () => {
        viewMode.value = viewMode.value === "zero" ? "current" : "zero";
        void nextTick(() => {
          taskListRef.value?.navigate("home");
        });
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "z",
      (event) => {
        executeIntent({ type: "zero-focused" }, getFocusedTaskId(event) ?? null);
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "r",
      (event) => {
        executeIntent({ type: "readd-focused" }, getFocusedTaskId(event) ?? null);
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "l",
      (event) => {
        executeIntent({ type: "toggle-later-for-focused" }, getFocusedTaskId(event) ?? null);
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "shift+l",
      () => {
        toggleLaterView();
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "shift+r",
      () => {
        const focusedTask = taskListRef.value?.getFocusedTask();
        if (focusedTask === undefined) return;

        newTodoFormRef.value?.focusWithText(focusedTask.title, {
          origId: focusedTask.id,
        });
      },
      { filterInput: true, prevent: true },
    )
    .add(
      ["f", "h", "shift+f", "shift+h"],
      (event: KeyboardEvent) => {
        const focusedTask = taskListRef.value?.getFocusedTask();
        if (focusedTask === undefined) return;

        if (event.shiftKey) {
          newTodoFormRef.value?.focusWithText(focusedTask.title, {
            postponed: true,
            origId: focusedTask.id,
          });
          return;
        }

        executeIntent({ type: "postpone-focused" }, focusedTask.id);
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "shift+right",
      () => {
        next();
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "ctrl+z",
      () => {
        undo();
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "ctrl+shift+z",
      () => {
        redo();
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "ctrl+c",
      (event) => {
        if (window.getSelection()?.toString()) return;

        const focusedTask = taskListRef.value?.getFocusedTask();
        if (focusedTask !== undefined) {
          void navigator.clipboard.writeText(focusedTask.title);
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { filterInput: true },
    )
    .add(
      "v",
      () => {
        const focusedItem = taskListRef.value?.getFocusedItem();
        focusedItem?.openFirstLink();
      },
      { filterInput: true, prevent: true },
    )
    .add(
      ["e", "enter", "f2"],
      () => {
        const focusedItem = taskListRef.value?.getFocusedItem();
        const focusedTask = taskListRef.value?.getFocusedTask();
        if (focusedItem === undefined || focusedTask === undefined) return;

        const newTitle = focusedItem.edit();
        if (newTitle === undefined) return;

        focusedTask.title = newTitle;
      },
      { filterInput: true, prevent: true },
    )
    .build();

  onMounted(() => {
    window.addEventListener("keydown", bindKeysHandler);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", bindKeysHandler);
  });
}
