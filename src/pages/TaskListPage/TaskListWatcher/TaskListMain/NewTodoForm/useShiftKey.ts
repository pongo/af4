import { onMounted, onUnmounted, ref, watch, type ShallowRef } from "vue";

export function useShiftKey(element: Readonly<ShallowRef<HTMLElement | null>>) {
  const shiftKey = ref(false);

  function updateShiftKey(event: KeyboardEvent) {
    if (event.shiftKey !== shiftKey.value) {
      shiftKey.value = event.shiftKey;
    }
  }

  function handleBlur() {
    if (shiftKey.value) shiftKey.value = false;
  }

  function register(el: HTMLElement | null) {
    if (!el) return;
    el.addEventListener("keydown", updateShiftKey, { passive: true });
    el.addEventListener("keyup", updateShiftKey, { passive: true });
    el.addEventListener("blur", handleBlur, { passive: true });
  }

  function unregister(el: HTMLElement | null) {
    if (!el) return;
    el.removeEventListener("keydown", updateShiftKey);
    el.removeEventListener("keyup", updateShiftKey);
    el.removeEventListener("blur", handleBlur);
  }

  onMounted(() => {
    register(element.value);
  });

  onUnmounted(() => {
    unregister(element.value);
  });

  watch(element, (newElement, oldElement) => {
    unregister(oldElement);
    register(newElement);
  });

  return { shiftKey };
}
