import { computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { assert } from "smart-invariant";
import { keysHandlerBuilder, digits, withModifier } from "bind-keys";
import { taskListLabelsStore } from "../lib/taskListLabelsStore";

export function useNavigationHotkeys() {
  const router = useRouter();
  const route = useRoute();
  const currentId = computed(() => route.params.id as string);
  const { navigateToNextList, navigateListByIndex } = taskListLabelsStore();

  function navigateByDirection(direction: "up" | "down") {
    if (!currentId.value) return;
    navigateToId(navigateToNextList(currentId.value, direction));
  }

  function navigateToId(id: string | undefined) {
    if (id !== undefined) {
      void router.replace(`/tl/${id}`);
    }
  }

  const bindKeysHandler = keysHandlerBuilder()
    .add(
      withModifier("alt", digits()),
      (event) => {
        const num = parseInt(event.key, 10);
        const index = (num === 0 ? 10 : num) - 1;
        assert(index >= 0 && index <= 9);
        navigateToId(navigateListByIndex(index));
      },
      { prevent: true },
    )
    .add(
      "q",
      () => {
        navigateByDirection("up");
      },
      { filterInput: true, prevent: true },
    )
    .add(
      "a",
      () => {
        navigateByDirection("down");
      },
      { filterInput: true, prevent: true },
    )
    .build();

  onMounted(() => {
    window.addEventListener("keydown", bindKeysHandler);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", bindKeysHandler);
  });
}
