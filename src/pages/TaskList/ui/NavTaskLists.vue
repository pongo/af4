<script setup lang="ts">
import { MoreHorizontal, Pencil, Trash2 } from "lucide-vue-next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useTaskListLabels } from "@/app/composables/useTaskListLabels";
import { useSortable } from "@vueuse/integrations/useSortable";
import { nextTick, useTemplateRef } from "vue";

const { taskListLabels, removeTaskListLabel, reorderLabels, renameTaskListLabel } =
  useTaskListLabels();
const { isMobile } = useSidebar();
const router = useRouter();
const route = useRoute();

const el = useTemplateRef("el");

useSortable(el, taskListLabels, {
  animation: 150,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEnd: async (event: any) => {
    if (event.oldIndex === event.newIndex) return;
    await nextTick();
    const ids = taskListLabels.value.map((item) => item.id);
    reorderLabels(ids);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

function changeTitle(name: string) {
  document.title = name;
}

async function handleDelete(id: string, name: string) {
  if (confirm(`Are you sure you want to delete "${name}"?`)) {
    await removeTaskListLabel(id);
    if (route.params.id === id) {
      router.push("/");
    }
  }
}

async function handleRename(id: string, currentName: string) {
  const newName = window.prompt("Enter new list name:", currentName);
  if (newName !== null && newName.trim() !== "" && newName !== currentName) {
    await renameTaskListLabel(id, newName.trim());
  }
}
</script>

<template>
  <SidebarGroup class="group-data-[collapsible=icon]:hidden">
    <SidebarGroupLabel class="select-none">Lists</SidebarGroupLabel>
    <SidebarMenu ref="el">
      <SidebarMenuItem
        v-for="item in taskListLabels"
        :key="item.id"
        :data-id="item.id"
        class="group/item"
      >
        <SidebarMenuButton as-child :is-active="item.id === $route.params.id">
          <RouterLink :to="`/tl/${item.id}`" :title="item.name" @click="changeTitle(item.name)">
            <span class="truncate">{{ item.name }}</span>
          </RouterLink>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <SidebarMenuAction show-on-hover>
              <MoreHorizontal />
              <span class="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            class="w-56 rounded-lg"
            :side="isMobile ? 'bottom' : 'right'"
            :align="isMobile ? 'end' : 'start'"
          >
            <DropdownMenuItem @click="handleRename(item.id, item.name)">
              <Pencil class="text-muted-foreground" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleDelete(item.id, item.name)">
              <Trash2 class="text-muted-foreground" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</template>
