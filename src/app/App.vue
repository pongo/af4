<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { SidebarProvider } from "@/components/ui/sidebar";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useNavigationHotkeys } from "@/app/composables/useNavigationHotkeys";

useNavigationHotkeys();

const router = useRouter();
let loadingTimer: ReturnType<typeof setTimeout>;
const isLoading = ref(false);

router.beforeEach(() => {
  clearTimeout(loadingTimer);
  loadingTimer = setTimeout(() => {
    isLoading.value = true;
  }, 200);
});

router.afterEach(() => {
  clearTimeout(loadingTimer);
  isLoading.value = false;
});

const changeChannel = new BroadcastChannel("af4-db-changes");
changeChannel.onmessage = (event) => {
  if (
    event.data.type === "delete" &&
    event.data.storeName === "tasklists_meta" &&
    event.data.id === router.currentRoute.value.params.id
  ) {
    router.push("/");
  }
};
</script>

<template>
  <SidebarProvider>
    <div class="flex h-screen w-full">
      <AppSidebar />
      <main>
        <!-- <SidebarTrigger /> -->
        <div class="absolute left-0 flex min-h-full w-full justify-center">
          <div class="w-full max-w-4xl p-6">
            <RouterView v-slot="{ Component }" :key="$route.fullPath">
              <component :is="isLoading ? LoadingSpinner : Component"></component>
            </RouterView>
          </div>
        </div>
      </main>
    </div>
  </SidebarProvider>
</template>
