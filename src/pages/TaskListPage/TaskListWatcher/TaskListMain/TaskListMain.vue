<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from "vue";
import NewTodoForm from "./NewTodoForm/NewTodoForm.vue";
import TaskList from "./TaskList/TaskList.vue";
import type { TaskList as TaskListState, UserAction, ViewListType } from "@/app/types.ts";
import { toast } from "vue3-toastify";
import { useDailyCleanup } from "@/app/composables/useDailyCleanup.ts";
import { dispatch } from "@/app/model/dispatch.ts";
import MyKbd from "@/components/MyKbd.vue";
import { useLaterNewCount } from "./useLaterNewCount.ts";
import type { TaskListViewMode } from "./types.ts";
import { useTaskListHotkeys } from "./useTaskListHotkeys.ts";

const props = defineProps<{ state: TaskListState }>();

useDailyCleanup(() => {
  const now = new Date();
  console.log("useDailyCleanup [TaskListView]", now);
  dispatch(props.state, { type: "Cleanup", now });
});

const newTodoFormRef = useTemplateRef("newTodoForm");
const taskListRef = useTemplateRef("taskList");
const viewMode = ref<TaskListViewMode>("current");
const viewList = computed<ViewListType>(() =>
  viewMode.value === "later" ? "later" : props.state.current.list,
);
const { laterNewCount, laterNewCountText } = useLaterNewCount(props.state);
const showLaterNewCount = computed(() => laterNewCount.value > 0 && viewMode.value === "current");

function handleAddTodo(
  title: string,
  { postponed = false, origId }: { readonly postponed?: boolean; readonly origId?: string },
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
  if (viewMode.value !== "current") return;
  dispatch(props.state, { type: "Next" });
  void nextTick(() => {
    taskListRef.value?.navigate("home");
  });
}

function toggleLaterView() {
  viewMode.value = viewMode.value === "later" ? "current" : "later";
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

function focusTask() {
  if (taskListRef.value == null) return;

  const focusedItem = taskListRef.value.getFocusedItem();
  if (focusedItem) {
    focusedItem.focus();
    return;
  }

  // focusedItem may be undefined after list cleanup. Then focus the last task
  taskListRef.value.navigate("end");
}

useTaskListHotkeys({
  state: props.state,
  viewMode,
  viewList,
  newTodoFormRef,
  taskListRef,
  notify,
  next,
  toggleLaterView,
  undo: () => {
    emit("undo", props.state.id);
  },
  redo: () => {
    emit("redo", props.state.id);
  },
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

    <div v-if="showLaterNewCount" class="mb-4 text-sm text-neutral-500">
      {{ laterNewCountText }}
      <span class="ml-0.75 *:text-xs">
        <MyKbd>Shift</MyKbd><span class="mx-0.75">+</span><MyKbd>L</MyKbd>
      </span>
    </div>

    <TaskList
      ref="taskList"
      :state="state"
      :view-list="viewList"
      :view-mode="viewMode"
      @next="next()"
    />
  </div>
</template>
