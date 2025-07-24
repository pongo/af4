<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, useTemplateRef } from "vue";
import NewTodoForm from "@/pages/TaskList/ui/NewTodoForm.vue";
import TaskList from "@/pages/TaskList/ui/TaskList.vue";
import hotkeys from "hotkeys-js";
import type { TaskList as TaskListType } from "@/app/types";
import { nanoid } from "nanoid";
import { af4 as makeAf4, applyActions as makeApplyActions } from "@/app/model/af4";
import { toast } from "vue3-toastify";
import { undoLocalStorage } from "@/app/lib/undoLocalStorage";
import { itemIconPosToggle } from "@/app/lib/toggles";

const props = defineProps<{ state: TaskListType }>();

const af4 = makeAf4({ generateId: nanoid, now: () => new Date() });
const applyActions = makeApplyActions({ generateId: nanoid, now: () => new Date() });

const newTodoFormRef = useTemplateRef("newTodoForm");
const taskListRef = useTemplateRef("taskList");

function handleAddTodo(title: string, { postponed = false }: { postponed?: boolean }) {
  const actions = af4(props.state, { type: postponed ? "AddPostponedTask" : "AddTask", title });
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

const tasks = [
  "Travel Agency",
  "Schedule newsletters?",
  "Restaurant L's birthday",
  "Card for L",
  "Weed Noguchi",
  "Portuguese 17",
  "Aeneid",
  "“Then She Found Me”",
  "Write E-book",
  "Write M",
  "Read Ultra Simple Gui",
  "Camera Manual",
  "Return chalk to T",
  "Brain trainer",
  "Tidy Office",
  "“Fleurs du Mal”",
  "Make Bed",
  "German 24/3",
  "Facebook",
  "Spanish 12/2",
  "Mow Lawn",
  "Sort out Google bar",
  "Blog “7 Habits of Poor",
  "“Saraband”",
  "Write",
  "Bureau Top tidy?",
  "MicroPlaza",
  "Reading List (oldest)",
  "Reading List (newest)",
  "G replied?",
  "Desk tidy?",
  "Exercise",
  "Walk",
  "Tax Return",
  "Photo Galleries",
  "Squarespace Videos",
  "Check BP",
  "Journal 10+",
  "Investment Managers",
  "RegZooka",
  "Cut Hedge",
  "NumberWatch",
  "Carswell",
  "“The Cell”",
  "Paper",
  "Comments",
  "Voicemail",
  "Fix date for lunch",
  "Email",
  "FTSE",
  "“Top Gear”",
  "Lowest Point Forecast",
  "Back Up",
  "Reading",
  "Doodle",
  "Change Wallpaper",
  "Reading List (quality)",
  "Pitch C#",
  "Wash Up",
];

function next() {
  const actions = af4(props.state, { type: "Next" });
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

    const actions = af4(props.state, { type: "CompleteTask", id });
    applyActions(props.state, actions);
  });

  hotkeys("delete, backspace", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = getFocusedTaskId(event);
    if (id === undefined) return;

    const actions = af4(props.state, { type: "DeleteTask", id });
    applyActions(props.state, actions);
  });

  hotkeys("z", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = getFocusedTaskId(event);
    if (id === undefined) return;

    const actions = af4(props.state, { type: "ZeroTask", id });
    applyActions(props.state, actions);
  });

  hotkeys("r", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = getFocusedTaskId(event);
    if (id === undefined) return;

    const actions = af4(props.state, { type: "ReaddTask", id });
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

    const actions = af4(props.state, { type: "CompleteTask", id });
    applyActions(props.state, actions);

    newTodoFormRef.value?.focusWithText(id);
  });

  hotkeys("f, h, shift+f, shift+h", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const id = getFocusedTaskId(event);
    if (id === undefined) return;

    if (hotkeys.shift) {
      const actions = af4(props.state, { type: "CompleteTask", id });
      applyActions(props.state, actions);
      newTodoFormRef.value?.focusWithText(id, { postponed: true });
      return;
    }

    const actions = af4(props.state, { type: "PostponeTask", id });
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
  // tasks.forEach((task) => void handleAddTodo(task));

  if (props.state.tasks.length === 0) {
    newTodoFormRef.value?.focus();
  }
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
