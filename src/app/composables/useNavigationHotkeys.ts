import { computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { assert } from "smart-invariant";
import { keysHandlerFactory } from "@/lib/bind-keys";
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

  const bindKeysHandler = keysHandlerFactory()
    .add(
      // [ 'Alt+0', 'Alt+1', 'Alt+2', ... ]
      Array.from({ length: 10 }, (_, i) => `alt+${i}`),
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
