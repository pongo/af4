import { onMounted, onUnmounted, ref, type ShallowRef } from "vue";

export function useShiftKey(element: Readonly<ShallowRef<HTMLInputElement | null>>) {
  const shiftKey = ref(false);

  function updateShiftKey(event: KeyboardEvent) {
    if (event.shiftKey !== shiftKey.value) {
      shiftKey.value = event.shiftKey;
    }
  }

  function handleBlur() {
    if (shiftKey.value) shiftKey.value = false;
  }

  onMounted(() => {
    if (!element.value) return;
    element.value.addEventListener("keydown", updateShiftKey, { passive: true });
    element.value.addEventListener("keyup", updateShiftKey, { passive: true });
    element.value.addEventListener("blur", handleBlur, { passive: true });
  });

  onUnmounted(() => {
    if (!element.value) return;
    element.value.removeEventListener("keydown", updateShiftKey);
    element.value.removeEventListener("keyup", updateShiftKey);
    element.value.removeEventListener("blur", handleBlur);
  });

  return { shiftKey };
}
