import { computed } from "vue";
import type { TaskList as TaskListState } from "@/app/types.ts";

const ruPluralRules = new Intl.PluralRules("ru-RU");

export function useLaterNewCount(state: TaskListState) {
  const laterNewCount = computed(
    () => state.tasks.filter((task) => task.list === "later" && task.status === "new").length,
  );
  const laterNewCountText = computed(() => {
    const count = laterNewCount.value;
    const taskWord = (() => {
      switch (ruPluralRules.select(count)) {
        case "one":
          return "задача";
        case "few":
          return "задачи";
        default:
          return "задач";
      }
    })();

    return `${count} ${taskWord} в списке «когда-нибудь»`;
  });

  return {
    laterNewCount,
    laterNewCountText,
  };
}
