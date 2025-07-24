import { computed, ref } from "vue";

export function useToggle<T>(values: T[]) {
  const index = ref(0);
  const currentValue = computed(() => values[index.value]);

  function next() {
    index.value = (index.value + 1) % values.length;
  }

  return { currentValue, next };
}
