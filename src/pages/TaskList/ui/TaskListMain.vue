<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, useTemplateRef } from "vue";
import NewTodoForm from "./NewTodoForm.vue";
import TaskList from "./TaskList/TaskList.vue";
import hotkeys from "hotkeys-js";
import type { TaskList as TTaskList, UserAction } from "@/app/types";
import { toast } from "vue3-toastify";
import { itemIconPosToggle } from "@/app/lib/toggles";
import { useDailyCleanup } from "@/app/composables/useDailyCleanup.ts";
import { dispatch } from "@/app/model/dispatch";

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
  nextTick(() => {
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

    dispatch(props.state, { type: "CompleteTask", id });
    return false;
  });

  hotkeys("delete, backspace", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    dispatch(props.state, { type: "DeleteTask", id });
    return false;
  });

  hotkeys("z", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    dispatch(props.state, { type: "ZeroTask", id });
    return false;
  });

  hotkeys("r", (event): false => {
    const id = getFocusedTaskId(event);
    if (id === undefined) return false;

    dispatch(props.state, { type: "ReaddTask", id });
    if (props.state.current.list !== "open") {
      notify("Задача заново добавлена в открытый список");
    }
    return false;
  });

  hotkeys("shift+r", (): false => {
    const focusedTask = taskListRef.value?.getFocusedTask();
    if (focusedTask === undefined) return false;

    newTodoFormRef.value?.focusWithText(focusedTask.title, { origId: focusedTask.id });
    return false;
  });

  hotkeys("f, h, shift+f, shift+h", (event: KeyboardEvent): false => {
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

  hotkeys("shift+right", (): false => {
    next();
    return false;
  });

  hotkeys("ctrl+z", (): false => {
    emit("undo", props.state.id);
    return false;
  });

  hotkeys("ctrl+shift+z", (): false => {
    emit("redo", props.state.id);
    return false;
  });

  hotkeys("'", (): false => {
    itemIconPosToggle.next();
    return false;
  });

  hotkeys("ctrl+c", () => {
    // if there is a selection, do not intercept
    if (window.getSelection()?.toString()) return true;

    // copy focused task title
    const focusedTask = taskListRef.value?.getFocusedTask();
    if (focusedTask !== undefined) {
      navigator.clipboard.writeText(focusedTask.title);
    }
    return false;
  });

  hotkeys("v", (): false => {
    const focusedItem = taskListRef.value?.getFocusedItem();
    focusedItem?.openFirstLink();
    return false;
  });

  hotkeys("e, enter, f2", (): false => {
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

function focusTask() {
  taskListRef.value?.getFocusedItem()?.focus();
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
      @focus-task="focusTask"
      placeholder="Press <space>, <c> or <n> to add a new task"
      class="mb-4"
    />

    <TaskList :state="state" ref="taskList" @next="next()" />
  </div>
</template>
