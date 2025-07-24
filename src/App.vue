<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { SidebarProvider } from "@/components/ui/sidebar";
</script>

<template>
  <SidebarProvider>
    <div class="flex h-screen w-full">
      <AppSidebar />
      <main>
        <!-- <SidebarTrigger /> -->
        <div class="absolute left-0 flex min-h-full w-full justify-center">
          <div class="w-full max-w-4xl p-6">
            <RouterView :key="$route.fullPath" />
          </div>
        </div>
      </main>
    </div>
  </SidebarProvider>
</template>
