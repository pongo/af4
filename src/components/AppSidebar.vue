<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import NavTaskLists from "./NavTaskLists.vue";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  type SidebarProps,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTaskListLabels } from "@/app/composables/useTaskListLabels";
import { RouterLink } from "vue-router";

const props = defineProps<SidebarProps>();

const { taskListLabels } = useTaskListLabels();
</script>

<template>
  <Sidebar class="border-r-0" v-bind="props">
    <SidebarContent>
      <NavTaskLists :taskListLabels="taskListLabels" />
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild class="select-none">
            <RouterLink to="/tl/new">
              <Plus />
              <span>New List</span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
