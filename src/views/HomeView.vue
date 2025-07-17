<script setup lang="ts">
import NewTodoForm from "../components/NewTodoForm.vue";
import TaskList from "../components/TaskList.vue";
import { createKeybindingsHandler } from "tinykeys";

const handler = createKeybindingsHandler({
  "Shift+D": () => {
    alert("The 'Shift' and 'd' keys were pressed at the same time");
  },
  "y e e t": () => {
    alert("The keys 'y', 'e', 'e', and 't' were pressed in order");
  },
  "$mod+KeyD": (event) => {
    event.preventDefault();
    alert("Either 'Control+d' or 'Meta+d' were pressed");
  },
});

window.addEventListener("keydown", handler);

function handleAddTodo() {}

const tasks = [
  "Cancel Insurance",
  "Write Henry S.",
  "Contribute to P & Y’s",
  "Buy Guillotine",
  "Weed Old Accounts",
  "Ring Ben’s Gutters",
  "Get Phoenix Insurance",
  "Investigate ways of",
  "Approaching business",
  "Photo Plus Manual",
  "Sort out domain hosti",
  "Photos for Facebook",
  "“Taxi Driver”",
  "“Fanny Cradock”",
  "“I Know Where I’m Goi",
  "“The Edge of the Worl",
];
</script>

<template>
  <main>
    <div class="max-w-4xl mx-auto p-6">
      <NewTodoForm
        @add-todo="handleAddTodo"
        placeholder="Press <space>, <c> or <n> to add a new task"
      />

      <TaskList :items="tasks" />
      <!-- <TodoList :todos="todos" /> -->
      <!-- 
      @toggle-complete="handleToggleComplete"
      @delete-todo="handleDeleteTodo"
      @update-todo="handleUpdateTodo" -->

      <!-- <TodoStats :total="todos.length" :remaining="remaining" /> -->
    </div>
  </main>
</template>
