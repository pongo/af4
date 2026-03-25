<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, useTemplateRef } from "vue";
import NewTodoForm from "./NewTodoForm/NewTodoForm.vue";
import TaskList from "./TaskList/TaskList.vue";
import { keysHandlerBuilder } from "@/lib/bind-keys";
import type { TaskList as TaskListState, UserAction } from "@/app/types.ts";
import { toast } from "vue3-toastify";
import { useDailyCleanup } from "@/app/composables/useDailyCleanup.ts";
import { dispatch } from "@/app/model/dispatch.ts";

const props = defineProps<{ state: TaskListState }>();

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
      const id = getFocusedTaskId(event);
      if (id === undefined) return;

      dispatch(props.state, { type: "CompleteTask", id });
    },
    { filterInput: true, prevent: true },
  )
  .add(
    ["delete", "backspace"],
    (event) => {
      const id = getFocusedTaskId(event);
      if (id === undefined) return;

      dispatch(props.state, { type: "DeleteTask", id });
    },
    { filterInput: true, prevent: true },
  )
  .add(
    "z",
    (event) => {
      const id = getFocusedTaskId(event);
      if (id === undefined) return;

      dispatch(props.state, { type: "ZeroTask", id });
    },
    { filterInput: true, prevent: true },
  )
  .add(
    "r",
    (event) => {
      const id = getFocusedTaskId(event);
      if (id === undefined) return;

      dispatch(props.state, { type: "ReaddTask", id });
      if (props.state.current.list !== "open") {
        notify("Задача заново добавлена в открытый список");
      }
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

      dispatch(props.state, { type: "PostponeTask", id: focusedTask.id });
      notify("Задача отложена до завтра");
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
      emit("undo", props.state.id);
    },
    { filterInput: true, prevent: true },
  )
  .add(
    "ctrl+shift+z",
    () => {
      emit("redo", props.state.id);
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
  window.addEventListener("keydown", bindKeysHandler);
});

onUnmounted(() => {
  window.removeEventListener("keydown", bindKeysHandler);
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
