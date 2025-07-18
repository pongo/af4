import { nextTick, ref, type ShallowRef } from "vue";
import TaskListItem from "./TaskListItem.vue";

type TaskListItem = InstanceType<typeof TaskListItem>;

const PAGE_SIZE_FALLBACK = 10;

export function useTaskListNavigation(
  items: string[],
  taskItems: Readonly<ShallowRef<TaskListItem[] | null>>,
) {
  const focusedIndex = ref<number>(0);

  return {
    focusedIndex,
    navigate,
  };

  function up() {
    if (focusedIndex.value === 0) {
      window.scrollTo({ top: 0 });
      return;
    }
    focusedIndex.value = Math.max(0, focusedIndex.value - 1);
  }

  function down() {
    const lastIndex = items.length - 1;
    if (focusedIndex.value === lastIndex) {
      window.scrollTo({ top: document.body.scrollHeight });
      return;
    }
    focusedIndex.value = Math.min(lastIndex, focusedIndex.value + 1);
  }

  function pageup(once = false) {
    const visibleIndices = getVisibleIndices();
    if (visibleIndices.length === 0) {
      focusedIndex.value = Math.max(0, focusedIndex.value - PAGE_SIZE_FALLBACK);
      return;
    }

    const firstVisibleIndex = visibleIndices[0];
    if (focusedIndex.value > firstVisibleIndex || once) {
      focusedIndex.value = Math.max(0, firstVisibleIndex);
      return;
    }

    /* focusedIndex.value = Math.max(0, focusedIndex.value - (visibleIndices[visibleIndices.length - 1] - visibleIndices[0])); */

    const focusedHeight = taskItems.value?.[focusedIndex.value]?.$el?.offsetHeight ?? 0;
    window.scrollBy({ top: -window.innerHeight + focusedHeight });
    nextTick(() => {
      pageup(true);
      // const visibleIndices = getVisibleIndices();
      // focusedIndex.value = Math.max(
      //   0,
      //   visibleIndices.length > 0 ? visibleIndices[0] : focusedIndex.value - PAGE_SIZE_FALLBACK,
      // );
    });
  }

  function pagedown(once = false) {
    const lastIndex = items.length - 1;

    const visibleIndices = getVisibleIndices();
    if (visibleIndices.length === 0) {
      focusedIndex.value = Math.min(lastIndex, focusedIndex.value + PAGE_SIZE_FALLBACK);
      return;
    }

    const lastVisibleIndex = visibleIndices[visibleIndices.length - 1];
    if (focusedIndex.value < lastVisibleIndex || once) {
      focusedIndex.value = Math.min(lastIndex, lastVisibleIndex);
      return;
    }

    /* focusedIndex.value = Math.min(itemsMin, focusedIndex.value + (lastVisibleIndex - visibleIndices[0])); */

    const focusedHeight = taskItems.value?.[focusedIndex.value]?.$el?.offsetHeight ?? 0;
    window.scrollBy({ top: window.innerHeight - focusedHeight });
    nextTick(() => {
      pagedown(true);
      // const visibleIndices = getVisibleIndices();
      // focusedIndex.value = Math.min(
      //   lastIndex,
      //   visibleIndices.length > 0
      //     ? visibleIndices[visibleIndices.length - 1]
      //     : focusedIndex.value + PAGE_SIZE_FALLBACK,
      // );
    });
  }

  function navigate(direction: "up" | "down" | "pageup" | "pagedown") {
    switch (direction) {
      case "up":
        up();
        return;
      case "down":
        down();
        return;
      case "pageup":
        pageup();
        return;
      case "pagedown":
        pagedown();
        return;
    }
  }

  function getVisibleIndices() {
    if (!taskItems.value) return [];
    return taskItems.value
      .map((component, index) => {
        const el = component?.$el;
        if (el) {
          const rect = (el as HTMLElement).getBoundingClientRect();
          if (
            rect.top < window.innerHeight &&
            rect.bottom < window.innerHeight &&
            rect.top > 0 &&
            rect.bottom > 0
          ) {
            return index;
          }
        }
        return null;
      })
      .filter((index) => index !== null);
  }
}

/* function scrollToFocusedItem() {
  const focusedElement = itemRefs.value[focusedIndex.value];
  if (!focusedElement || !containerRef.value) return;
  
  const containerRect = containerRef.value.getBoundingClientRect();
  const elementRect = focusedElement.getBoundingClientRect();
  
  // Проверяем, виден ли элемент полностью
  const isVisible = elementRect.top >= containerRect.top && 
                   elementRect.bottom <= containerRect.bottom;
  
  if (!isVisible) {
    focusedElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'nearest' 
    });
  }
} */
