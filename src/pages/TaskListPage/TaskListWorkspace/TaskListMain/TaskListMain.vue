<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, useTemplateRef } from "vue";
import NewTodoForm from "./NewTodoForm.vue";
import TaskList from "./TaskList/TaskList.vue";
import hotkeys, { type KeyHandler } from "hotkeys-js";
import type { TaskList as TTaskList, UserAction } from "@/app/types.ts";
import { toast } from "vue3-toastify";
import { itemIconPosToggle } from "@/app/lib/toggles.ts";
import { useDailyCleanup } from "@/app/composables/useDailyCleanup.ts";
import { dispatch } from "@/app/model/dispatch.ts";

const props = defineProps<{ state: TTaskList }>();

useDailyCleanup(() => {
  const now = new Date();
  console.log("useDailyCleanup [TaskListView]", now);
  dispatch(props.state, { type: "Cleanup", now });
});

const newTodoFormRef = useTemplateRef("newTodoForm");
const taskListRef = useTemplateRef("taskList");

function handleAddTodo(
  title: string,
  { postponed = false, origId }: { postponed?: boolean; origId?: string },
) {
  dispatch(props.state, getAction());
  void nextTick(() => {
    newTodoFormRef.value?.focus();
  });

  if (props.state.system === "af4" || props.state.system === undefined) {
    if (props.state.current.list !== "open") {
      if (postponed) {
        notify("Задача добавлена на завтра");
      } else {
        notify("Задача добавлена в открытый список");
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (props.state.current.list === "open" && props.state.current.actionedCount > 0) {
      notify("Задача появится после перехода из закрытого списка");
    }
    return;
  }

  if (postponed) {
    notify("Задача добавлена на завтра");
  }

  function getAction(): UserAction {
    if (postponed) {
      if (origId !== undefined) return { type: "PostponeTask", id: origId, title };
      return { type: "AddPostponedTask", title };
    }
    if (origId !== undefined) return { type: "ReaddTask", id: origId, title };
    return { type: "AddTask", title };
  }
}

const emit = defineEmits<{ undo: [string]; redo: [string] }>();

function next() {
  dispatch(props.state, { type: "Next" });
  void nextTick(() => {
    taskListRef.value?.navigate("home");
  });
}

function notify(message: string) {
  toast(message, {
    position: "bottom-center",
    hideProgressBar: true,
    autoClose: 2500,
    pauseOnFocusLoss: false,
    // theme: "colored",
    // type: "success",
  });
}

const boundKeys = new Set<string>();

function bindKey(keys: string, callback: KeyHandler) {
  boundKeys.add(keys);
  hotkeys(keys, callback);
}

function bindHotkeys() {
  bindKey("space, c, n", (): false => {
    newTodoFormRef.value?.focus();
    return false;
  });

  bindKey("up, w, j", (): false => {
    taskListRef.value?.navigate("up");
    return false;
  });

  bindKey("down, s, k", (): false => {
    taskListRef.value?.navigate("down");
    return false;
  });

  bindKey("home", (): false => {
    taskListRef.value?.navigate("home");
    return false;
  });

  bindKey("end", (): false => {
    taskListRef.value?.navigate("end");
    return false;
  });

  bindKey("pageup, pgup", (): false => {
    taskListRef.value?.navigate("pageup");
    return false;
  });

  bindKey("pagedown, pgdown", (): false => {
    taskListRef.value?.navigate("pagedown");
    return false;
  });

  bindKey("x, d", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    dispatch(props.state, { type: "CompleteTask", id });
    return false;
  });

  bindKey("delete, backspace", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    dispatch(props.state, { type: "DeleteTask", id });
    return false;
  });

  bindKey("z", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    dispatch(props.state, { type: "ZeroTask", id });
    return false;
  });

  bindKey("r", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    dispatch(props.state, { type: "ReaddTask", id });
    if (props.state.current.list !== "open") {
      notify("Задача заново добавлена в открытый список");
    }
    return false;
  });

  bindKey("shift+r", (): false => {
    const focusedTask = taskListRef.value?.getFocusedTask();
    if (focusedTask === undefined) return false;

    newTodoFormRef.value?.focusWithText(focusedTask.title, { origId: focusedTask.id });
    return false;
  });

  bindKey("f, h, shift+f, shift+h", (event: KeyboardEvent): false => {
    const focusedTask = taskListRef.value?.getFocusedTask();
    if (focusedTask === undefined) return false;

    if (event.shiftKey) {
      newTodoFormRef.value?.focusWithText(focusedTask.title, {
        postponed: true,
        origId: focusedTask.id,
      });
      return false;
    }

    dispatch(props.state, { type: "PostponeTask", id: focusedTask.id });
    notify("Задача отложена до завтра");
    return false;
  });

  bindKey("shift+right", (): false => {
    next();
    return false;
  });

  bindKey("ctrl+z", (): false => {
    emit("undo", props.state.id);
    return false;
  });

  bindKey("ctrl+shift+z", (): false => {
    emit("redo", props.state.id);
    return false;
  });

  bindKey("'", (): false => {
    itemIconPosToggle.next();
    return false;
  });

  bindKey("ctrl+c", () => {
    // if there is a selection, do not intercept
    if (window.getSelection()?.toString()) return true;

    // copy focused task title
    const focusedTask = taskListRef.value?.getFocusedTask();
    if (focusedTask !== undefined) {
      void navigator.clipboard.writeText(focusedTask.title);
    }
    return false;
  });

  bindKey("v", (): false => {
    const focusedItem = taskListRef.value?.getFocusedItem();
    focusedItem?.openFirstLink();
    return false;
  });

  bindKey("e, enter, f2", (): false => {
    const focusedItem = taskListRef.value?.getFocusedItem();
    const focusedTask = taskListRef.value?.getFocusedTask();
    if (focusedItem === undefined || focusedTask === undefined) return false;

    const newTitle = focusedItem.edit();
    if (newTitle === undefined) return false;

    focusedTask.title = newTitle;
    // const actions = createActions(props.state, { type: "EditTask", id: focusedTask.id, title: newTitle });
    // applyActions(props.state, actions);
    return false;
  });
}

function unbindHotkeys() {
  for (const keys of boundKeys) {
    hotkeys.unbind(keys);
  }
  boundKeys.clear();
}

function focusTask() {
  taskListRef.value?.getFocusedItem()?.focus();
}

function getFocusedTaskId(event: KeyboardEvent) {
  const id = (event.target as HTMLElement).dataset.id;
  if (id !== undefined) {
    return id;
  }
  const focusedTask = taskListRef.value?.getFocusedTask();
  return focusedTask !== undefined ? focusedTask.id : undefined;
}

onMounted(() => {
  bindHotkeys();
});

onUnmounted(() => {
  unbindHotkeys();
});
</script>

<template>
  <div _class="mx-auto max-w-4xl p-6">
    <NewTodoForm
      ref="newTodoForm"
      placeholder="Press <space>, <c> or <n> to add a new task"
      class="mb-4"
      @add-todo="handleAddTodo"
      @focus-task="focusTask"
    />

    <TaskList ref="taskList" :state="state" @next="next()" />
  </div>
</template>
