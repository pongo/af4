<script setup lang="ts">
import { MoreHorizontal, Trash2 } from "lucide-vue-next";

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
import type { TaskListLabel } from "@/app/composables/useTaskListLabels";
import { RouterLink } from "vue-router";

defineProps<{
  taskListLabels: Readonly<TaskListLabel[]>;
}>();

const { isMobile } = useSidebar();

function changeTitle(name: string) {
  document.title = name;
}
</script>

<template>
  <SidebarGroup class="group-data-[collapsible=icon]:hidden">
    <SidebarGroupLabel class="select-none">Lists</SidebarGroupLabel>
    <SidebarMenu>
      <SidebarMenuItem v-for="item in taskListLabels" :key="item.id">
        <SidebarMenuButton as-child :is-active="item.id === $route.params.id">
          <RouterLink :to="`/tl/${item.id}`" :title="item.name" @click="changeTitle(item.name)">
            <span>{{ item.name }}</span>
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
            <DropdownMenuItem>
              <Trash2 class="text-muted-foreground" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</template>
