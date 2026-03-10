<!-- eslint-disable @typescript-eslint/no-misused-promises -->
<!-- eslint-disable @typescript-eslint/no-floating-promises -->
<script lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

export function useVersionCheck() {
  const isNewVersionAvailable = ref(false);
  const newVersionDetails = ref<string | null>(null);
  const versionCheckError = ref<string | null>(null);
  const initialVersion = ref<string | null>(null);
  const initialTag = ref<string | null>(null);
  const versionJsonPath = import.meta.env.BASE_URL + "version.json";
  let intervalId: number | undefined;

  async function fetchVersionJson() {
    const response = await fetch(versionJsonPath);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${versionJsonPath}: ${response.status} ${response.statusText}`,
      );
    }
    return await response.json();
  }

  async function fetchInitialVersion() {
    try {
      const data = await fetchVersionJson();
      initialVersion.value = data.version;
      initialTag.value = data.tag;
    } catch (e) {
      console.error("Failed to fetch initial version.json:", e);
    }
  }

  async function checkVersion() {
    if (initialVersion.value === null || initialTag.value === null) {
      return;
    }

    try {
      const currentData = await fetchVersionJson();
      versionCheckError.value = null;

      if (currentData.version !== initialVersion.value || currentData.tag !== initialTag.value) {
        isNewVersionAvailable.value = true;
        newVersionDetails.value = `${currentData.version} (${currentData.tag})`;
        if (intervalId) clearInterval(intervalId);
      }
    } catch (e: unknown) {
      console.error("Error checking for new version:", e);
      versionCheckError.value = e instanceof Error ? e.message : "Unknown error checking version";
    }
  }

  onMounted(async () => {
    await fetchInitialVersion();
    intervalId = window.setInterval(checkVersion, 30_000);
  });

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
  });

  return {
    isNewVersionAvailable,
    newVersionDetails,
    versionCheckError
  };
}
</script>

<script setup lang="ts">
defineProps<{
  isNewVersionAvailable: boolean;
  newVersionDetails: string | null;
  versionCheckError: string | null;
}>();
</script>

<template>
  <div
    v-if="isNewVersionAvailable"
    class="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800"
    role="alert"
  >
    ⚠️
    <span>
      A new version of the application is available. Please refresh the page.
      <span v-if="newVersionDetails" class="ml-1 font-semibold text-yellow-600"
        >(New: {{ newVersionDetails }})</span
      >
    </span>
  </div>
  <div
    v-else-if="versionCheckError"
    class="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
    role="alert"
  >
    ❌
    <span>Error checking for updates: {{ versionCheckError }}</span>
  </div>
</template>
