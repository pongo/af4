<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, useTemplateRef } from "vue";
import NewTodoForm from "@/pages/TaskList/ui/NewTodoForm.vue";
import TaskList from "@/pages/TaskList/ui/TaskList.vue";
import hotkeys from "hotkeys-js";
import type { TaskListAction, TaskList as TTaskList, UserAction } from "@/app/types";
import { nanoid } from "nanoid";
import { af4 as makeAf4, applyActions as makeApplyActions } from "@/app/model/af4";
import { simple as makeSimple } from "@/app/model/simple";
import { toast } from "vue3-toastify";
import { undoLocalStorage } from "@/app/lib/undoLocalStorage";
import { itemIconPosToggle } from "@/app/lib/toggles";
import { useTaskListLabels } from "@/app/composables/useTaskListLabels.ts";
import { useRouter } from "vue-router";
import { assert } from "smart-invariant";
import { createKeybindingsHandler } from "tinykeys";
import { useDailyCleanup } from "@/app/composables/useDailyCleanup.ts";

const props = defineProps<{ state: TTaskList }>();

const af4 = makeAf4({ generateId: nanoid, now: () => new Date() });
const simple = makeSimple({ generateId: nanoid, now: () => new Date() });
const applyActions = makeApplyActions({ generateId: nanoid, now: () => new Date() });

useDailyCleanup(() => {
  applyActions(props.state, [
    { type: "DeleteAllDeletedTasks" },
    { type: "CheckPostponedTasks" },
    { type: "CleanList", list: props.state.current.list },
  ]);
});

const newTodoFormRef = useTemplateRef("newTodoForm");
const taskListRef = useTemplateRef("taskList");

const { navigateListLabel } = useTaskListLabels();
const router = useRouter();

function handleAddTodo(title: string, { postponed = false }: { postponed?: boolean }) {
  const actions = createActions(props.state, {
    type: postponed ? "AddPostponedTask" : "AddTask",
    title,
  });
  applyActions(props.state, actions);
  nextTick(() => {
    newTodoFormRef.value?.focus();
  });

  if (props.state.system === "af4" || props.state.system === undefined) {
    if (props.state.current.list !== "open") {
      if (postponed) {
        notify("Задача добавлена на завтра");
      } else {
        notify("Задача добавлена в открытый список");
      }
    } else if (props.state.current.list === "open" && props.state.current.actionedCount > 0) {
      notify("Задача появится после перехода из закрытого списка");
    }
    return;
  }

  if (postponed) {
    notify("Задача добавлена на завтра");
  }
}

function createActions(tasklist: TTaskList, action: UserAction): TaskListAction[] {
  if (tasklist.system === undefined || tasklist.system === "af4") {
    return af4(tasklist, action);
  }
  if (tasklist.system === "simple") {
    return simple(tasklist, action);
  }

  throw new Error("Unknown system");
}

function next() {
  const actions = createActions(props.state, { type: "Next" });
  applyActions(props.state, actions);
  nextTick(() => {
    taskListRef.value?.navigate("home");
  });
}

function notify(message: string) {
  toast(message, {
    position: "bottom-center",
    hideProgressBar: true,
    // theme: "colored",
    // type: "success",
  });
}

const tinykeysHandler = createKeybindingsHandler({
  "Alt+([0-9])": (event) => {
    event.preventDefault();
    event.stopPropagation();
    const num = parseInt(event.key, 10);
    const index = (num === 0 ? 10 : num) - 1;
    assert(index >= 0 && index <= 9);
    const nextId = navigateListLabel(props.state.id, { index });
    if (nextId === undefined) return;
    router.replace(`/tl/${nextId}`);
  },
});

function bindHotkeys() {
  hotkeys("space, c, n", (): false => {
    newTodoFormRef.value?.focus();
    return false;
  });

  hotkeys("up, w, j", (): false => {
    taskListRef.value?.navigate("up");
    return false;
  });

  hotkeys("down, s, k", (): false => {
    taskListRef.value?.navigate("down");
    return false;
  });

  hotkeys("home", (): false => {
    taskListRef.value?.navigate("home");
    return false;
  });

  hotkeys("end", (): false => {
    taskListRef.value?.navigate("end");
    return false;
  });

  hotkeys("pageup, pgup", (): false => {
    taskListRef.value?.navigate("pageup");
    return false;
  });

  hotkeys("pagedown, pgdown", (): false => {
    taskListRef.value?.navigate("pagedown");
    return false;
  });

  hotkeys("x, d", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    const actions = createActions(props.state, { type: "CompleteTask", id });
    applyActions(props.state, actions);
    return false;
  });

  hotkeys("delete, backspace", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    const actions = createActions(props.state, { type: "DeleteTask", id });
    applyActions(props.state, actions);
    return false;
  });

  hotkeys("z", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    const actions = createActions(props.state, { type: "ZeroTask", id });
    applyActions(props.state, actions);
    return false;
  });

  hotkeys("r", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    const actions = createActions(props.state, { type: "ReaddTask", id });
    applyActions(props.state, actions);
    if (props.state.current.list !== "open") {
      notify("Задача заново добавлена в открытый список");
    }
    return false;
  });

  hotkeys("shift+r", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    const actions = createActions(props.state, { type: "CompleteTask", id });
    applyActions(props.state, actions);

    newTodoFormRef.value?.focusWithText(id);
    return false;
  });

  hotkeys("f, h, shift+f, shift+h", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    if (hotkeys.shift) {
      const actions = createActions(props.state, { type: "CompleteTask", id });
      applyActions(props.state, actions);
      newTodoFormRef.value?.focusWithText(id, { postponed: true });
      return false;
    }

    const actions = createActions(props.state, { type: "PostponeTask", id });
    applyActions(props.state, actions);
    notify("Задача отложена до завтра");
    return false;
  });

  hotkeys("shift+right", (): false => {
    next();
    return false;
  });

  hotkeys("ctrl+shift+z", (): false => {
    undoLocalStorage.restore(props.state.id);
    notify("Обновите страницу");
    return false;
  });

  hotkeys("'", (): false => {
    itemIconPosToggle.next();
    return false;
  });

  hotkeys("ctrl+c", (): false => {
    const focusedTask = taskListRef.value?.getFocusedTask();
    if (focusedTask !== undefined) {
      navigator.clipboard.writeText(focusedTask.title);
    }
    return false;
  });

  hotkeys("q,a", (event, handler): false => {
    const nextId = navigateListLabel(props.state.id, {
      direction: handler.key === "q" ? "up" : "down",
    });
    if (nextId !== undefined) {
      router.replace(`/tl/${nextId}`);
    }
    return false;
  });

  hotkeys("v", (): false => {
    const focusedItem = taskListRef.value?.getFocusedItem();
    focusedItem?.openFirstLink();
    return false;
  });
}

function getFocusedTaskId(event: KeyboardEvent) {
  const id = (event?.target as HTMLElement)?.dataset.id;
  if (id !== undefined) {
    return id;
  }
  const focusedTask = taskListRef.value?.getFocusedTask();
  return focusedTask !== undefined ? focusedTask.id : undefined;
}

onMounted(() => {
  bindHotkeys();
  window.addEventListener("keydown", tinykeysHandler);

  // if (props.state.tasks.length === 0) {
  //   newTodoFormRef.value?.focus();
  // }
});
onUnmounted(() => {
  hotkeys.unbind();
  window.removeEventListener("keydown", tinykeysHandler);
});
</script>

<template>
  <div _class="mx-auto max-w-4xl p-6">
    <NewTodoForm
      ref="newTodoForm"
      @add-todo="handleAddTodo"
      placeholder="Press <space>, <c> or <n> to add a new task"
      class="mb-4"
    />

    <TaskList :state="state" ref="taskList" @next="next()" />
  </div>
</template>
