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

const props = defineProps<{ state: TTaskList }>();

const af4 = makeAf4({ generateId: nanoid, now: () => new Date() });
const simple = makeSimple({ generateId: nanoid, now: () => new Date() });
const applyActions = makeApplyActions({ generateId: nanoid, now: () => new Date() });

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
  if (props.state.current.list !== "open") {
    if (postponed) {
      notify("Задача добавлена на завтра");
    } else {
      notify("Задача добавлена в открытый список");
    }
  } else if (props.state.current.list === "open" && props.state.current.actionedCount > 0) {
    notify("Задача появится после перехода из закрытого списка");
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

function bindHotkeys() {
  hotkeys("space, c, n", (event) => {
    event.preventDefault();
    event.stopPropagation();
    newTodoFormRef.value?.focus();
  });

  hotkeys("up, w, j", (event) => {
    event.preventDefault();
    event.stopPropagation();
    taskListRef.value?.navigate("up");
  });

  hotkeys("down, s, k", (event) => {
    event.preventDefault();
    event.stopPropagation();
    taskListRef.value?.navigate("down");
  });

  hotkeys("home", (event) => {
    event.preventDefault();
    event.stopPropagation();
    taskListRef.value?.navigate("home");
  });

  hotkeys("end", (event) => {
    event.preventDefault();
    event.stopPropagation();
    taskListRef.value?.navigate("end");
  });

  hotkeys("pageup, pgup", (event) => {
    event.preventDefault();
    event.stopPropagation();
    taskListRef.value?.navigate("pageup");
  });

  hotkeys("pagedown, pgdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    taskListRef.value?.navigate("pagedown");
  });

  hotkeys("x, d", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = getFocusedTaskId(event);
    if (id === undefined) return;

    const actions = createActions(props.state, { type: "CompleteTask", id });
    applyActions(props.state, actions);
  });

  hotkeys("delete, backspace", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = getFocusedTaskId(event);
    if (id === undefined) return;

    const actions = createActions(props.state, { type: "DeleteTask", id });
    applyActions(props.state, actions);
  });

  hotkeys("z", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = getFocusedTaskId(event);
    if (id === undefined) return;

    const actions = createActions(props.state, { type: "ZeroTask", id });
    applyActions(props.state, actions);
  });

  hotkeys("r", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = getFocusedTaskId(event);
    if (id === undefined) return;

    const actions = createActions(props.state, { type: "ReaddTask", id });
    applyActions(props.state, actions);
    if (props.state.current.list !== "open") {
      notify("Задача заново добавлена в открытый список");
    }
  });

  hotkeys("shift+r", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = getFocusedTaskId(event);
    if (id === undefined) return;

    const actions = createActions(props.state, { type: "CompleteTask", id });
    applyActions(props.state, actions);

    newTodoFormRef.value?.focusWithText(id);
  });

  hotkeys("f, h, shift+f, shift+h", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = getFocusedTaskId(event);
    if (id === undefined) return;

    if (hotkeys.shift) {
      const actions = createActions(props.state, { type: "CompleteTask", id });
      applyActions(props.state, actions);
      newTodoFormRef.value?.focusWithText(id, { postponed: true });
      return;
    }

    const actions = createActions(props.state, { type: "PostponeTask", id });
    applyActions(props.state, actions);
    notify("Задача отложена до завтра");
  });

  hotkeys("shift+right", (event) => {
    event.preventDefault();
    event.stopPropagation();
    next();
  });

  hotkeys("ctrl+shift+z", (event) => {
    event.preventDefault();
    event.stopPropagation();
    undoLocalStorage.restore(props.state.id);
    notify("Обновите страницу");
  });

  hotkeys("'", (event) => {
    event.preventDefault();
    event.stopPropagation();
    itemIconPosToggle.next();
  });

  hotkeys("f2", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = getFocusedTaskId(event);
    if (id === undefined) return;
  });

  hotkeys("ctrl+c", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const focusedTask = taskListRef.value?.getFocusedTask();
    if (focusedTask === undefined) return;
    navigator.clipboard.writeText(focusedTask.title);
  });

  hotkeys("q,a", (event, handler) => {
    event.preventDefault();
    event.stopPropagation();
    const nextId = navigateListLabel(props.state.id, {
      direction: handler.key === "q" ? "up" : "down",
    });
    if (nextId === undefined) return;
    router.replace(`/tl/${nextId}`);
  });

  hotkeys("alt+1, alt+2, alt+3, alt+4, alt+5, alt+6, alt+7, alt+8, alt+9", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const index = parseInt(event.key, 10) - 1;
    assert(index >= 0 && index <= 8);
    const nextId = navigateListLabel(props.state.id, { index });
    if (nextId === undefined) return;
    router.replace(`/tl/${nextId}`);
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
  // if (props.state.tasks.length === 0) {
  //   newTodoFormRef.value?.focus();
  // }
});
onUnmounted(() => {
  hotkeys.unbind();
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
