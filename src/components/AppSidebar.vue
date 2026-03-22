<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import NavTaskLists from "@/components/NavTaskLists.vue";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  type SidebarProps,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { RouterLink } from "vue-router";

const props = defineProps<SidebarProps>();
</script>

<template>
  <Sidebar class="border-r-0" v-bind="props">
    <SidebarContent>
      <NavTaskLists />
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton as-child class="select-none">
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
