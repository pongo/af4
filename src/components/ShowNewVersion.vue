<!-- eslint-disable @typescript-eslint/no-misused-promises -->
<!-- eslint-disable @typescript-eslint/no-floating-promises -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";

const props = defineProps<{
  initialVersion: string | null;
  initialTag: string | null;
}>();

const { isNewVersionAvailable, newVersionDetails, error } = useVersionCheck();

// Inline Composable for version checking
function useVersionCheck() {
  const isNewVersionAvailable = ref(false);
  const newVersionDetails = ref<string | null>(null);
  const error = ref<string | null>(null);
  let intervalId: number | undefined;

  const checkVersion = async () => {
    if (props.initialVersion === null || props.initialTag === null) {
      return;
    }

    try {
      const response = await fetch(import.meta.env.BASE_URL + "version.json");
      if (!response.ok) {
        throw new Error(`Failed to fetch version.json: ${response.status} ${response.statusText}`);
      }
      const currentData = await response.json();
      error.value = null;

      if (currentData.version !== props.initialVersion || currentData.tag !== props.initialTag) {
        isNewVersionAvailable.value = true;
        newVersionDetails.value = `${currentData.version} (${currentData.tag})`;
        if (intervalId) clearInterval(intervalId);
      }
    } catch (e: unknown) {
      console.error("Error checking for new version:", e);
      if (e instanceof Error) {
        error.value = e.message;
      } else {
        error.value = "Unknown error checking version";
      }
    }
  };

  onMounted(() => {
    if (props.initialVersion !== null && props.initialTag !== null) {
      checkVersion();
    }
    intervalId = window.setInterval(checkVersion, 30_000);
  });

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId);
  });

  watch(
    () => [props.initialVersion, props.initialTag],
    ([newInitialVersion, newInitialTag], [oldInitialVersion, oldInitialTag]) => {
      if (
        newInitialVersion !== null &&
        newInitialTag !== null &&
        (oldInitialVersion === null || oldInitialTag === null)
      ) {
        checkVersion();
      }
    },
  );

  return {
    isNewVersionAvailable,
    newVersionDetails,
    error,
    checkVersion, // Exposing checkVersion in case it's needed externally, though not currently used
  };
}
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
    v-else-if="error"
    class="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
    role="alert"
  >
    ❌
    <span>Error checking for updates: {{ error }}</span>
  </div>
</template>
