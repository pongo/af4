<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { SidebarProvider } from "@/components/ui/sidebar";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useNavigationHotkeys } from "@/app/composables/useNavigationHotkeys";
import ShowNewVersion from "@/components/ShowNewVersion.vue";

const meta = ref<{ name: string; version: string; tag: string } | null>(null);

onMounted(async () => {
  try {
    const response = await fetch(import.meta.env.BASE_URL + "version.json");
    if (!response.ok) {
      // It's possible version.json doesn't exist yet (e.g. during dev before first build or error)
      // Log the error but allow the app to continue without runtime version info.
      console.warn(`Could not fetch /version.json: ${response.status} ${response.statusText}`);
      // meta.value will remain null, handled gracefully by the template and ShowNewVersion component
      return;
    }
    meta.value = await response.json();
  } catch (e) {
    console.error("Failed to fetch initial version.json:", e);
    // meta.value will remain null
  }
});

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
</script>

<template>
  <SidebarProvider>
    <div class="flex h-screen w-full">
      <AppSidebar />
      <main>
        <!-- <SidebarTrigger /> -->
        <div class="absolute left-0 flex min-h-full w-full justify-center">
          <div class="w-full max-w-4xl p-6">
            <ShowNewVersion
              :initial-version="meta?.version ?? null"
              :initial-tag="meta?.tag ?? null"
            />
            <RouterView v-slot="{ Component }" :key="$route.fullPath">
              <component :is="isLoading ? LoadingSpinner : Component"></component>
            </RouterView>
          </div>
        </div>
      </main>
    </div>
  </SidebarProvider>
</template>
