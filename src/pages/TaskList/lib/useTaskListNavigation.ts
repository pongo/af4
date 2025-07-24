import { nextTick, ref, type Ref, type ShallowRef } from "vue";
import TaskListItem from "../ui/TaskListItem.vue";
import type { Task } from "@/app/types";

type TaskListItem = InstanceType<typeof TaskListItem>;

const PAGE_SIZE_FALLBACK = 10;

class Navigation {
  constructor(
    private items: Ref<Task[]>,
    private taskItems: Readonly<ShallowRef<TaskListItem[] | null>>,
    private focusedIndex: Ref<number>,
  ) {}

  up() {
    // если мы уже на самой первой задаче, то прокручиваем страницу вверх,
    // чтобы была видна форма добавления задачи
    if (this.focusedIndex.value === 0) {
      scrollTop();
      return;
    }
    this.focusedIndex.value = Math.max(0, this.focusedIndex.value - 1);
  }

  down() {
    const lastIndex = this.items.value.length - 1;
    // если мы уже на самой последней задаче, то прокручиваем страницу вниз,
    // чтобы был виден контент снизу
    if (this.focusedIndex.value === lastIndex) {
      scrollBottom();
      return;
    }
    this.focusedIndex.value = Math.min(lastIndex, this.focusedIndex.value + 1);
  }

  home() {
    this.focusedIndex.value = 0;
    scrollTop();
  }

  end() {
    this.focusedIndex.value = this.items.value.length - 1;
    scrollBottom();
  }

  pageup(once = false) {
    // для постраничной прокрутки мы находим индексы видимых задач
    const visibleIndices = getVisibleIndices(this.taskItems.value);

    // если найти не удалось, то перемещаем фокус на PAGE_SIZE_FALLBACK задач
    if (visibleIndices.length === 0) {
      this.focusedIndex.value = Math.max(0, this.focusedIndex.value - PAGE_SIZE_FALLBACK);
      return;
    }

    // иначе перемещаем фокус на самую первую видимую задачу
    const firstVisibleIndex = visibleIndices[0];
    if (this.focusedIndex.value > firstVisibleIndex || once) {
      this.focusedIndex.value = Math.max(0, firstVisibleIndex);
      return;
    }

    /* focusedIndex.value = Math.max(0, focusedIndex.value - (visibleIndices[visibleIndices.length - 1] - visibleIndices[0])); */

    // но если мы уже находимся на самой первой видимой задаче, то
    // сперва прокручиваем страницу, а затем заново вызываем эту процедуру
    const focusedHeight = this.taskItems.value?.[this.focusedIndex.value]?.$el?.offsetHeight ?? 0;
    window.scrollBy({ top: -window.innerHeight + focusedHeight });
    nextTick(() => {
      this.pageup(true);
    });
  }

  pagedown(once = false) {
    const lastIndex = this.items.value.length - 1;

    const visibleIndices = getVisibleIndices(this.taskItems.value);
    if (visibleIndices.length === 0) {
      this.focusedIndex.value = Math.min(lastIndex, this.focusedIndex.value + PAGE_SIZE_FALLBACK);
      return;
    }

    const lastVisibleIndex = visibleIndices[visibleIndices.length - 1];
    if (this.focusedIndex.value < lastVisibleIndex || once) {
      this.focusedIndex.value = Math.min(lastIndex, lastVisibleIndex);
      return;
    }

    /* focusedIndex.value = Math.min(itemsMin, focusedIndex.value + (lastVisibleIndex - visibleIndices[0])); */

    const focusedHeight = this.taskItems.value?.[this.focusedIndex.value]?.$el?.offsetHeight ?? 0;
    window.scrollBy({ top: window.innerHeight - focusedHeight });
    nextTick(() => {
      this.pagedown(true);
    });
  }
}

function scrollBottom() {
  window.scrollTo({ top: document.body.scrollHeight });
}

function scrollTop() {
  window.scrollTo({ top: 0 });
}

export function useTaskListNavigation(
  items: Ref<Task[]>,
  taskItems: Readonly<ShallowRef<TaskListItem[] | null>>,
) {
  const focusedIndex = ref<number>(0);
  const nav = new Navigation(items, taskItems, focusedIndex);

  return {
    focusedIndex,
    navigate,
  };

  function navigate(direction: "up" | "down" | "pageup" | "pagedown" | "home" | "end") {
    nav[direction]();
  }
}

function getVisibleIndices(taskItems: TaskListItem[] | null) {
  if (!taskItems) return [];
  return taskItems
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
