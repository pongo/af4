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

  const bindKeysHandler = keysHandlerFactory()
    .add(
      Array.from({ length: 10 }, (_, i) => `Alt+${i}`),
      (event) => {
        const num = parseInt(event.key, 10);
        const index = (num === 0 ? 10 : num) - 1;
        assert(index >= 0 && index <= 9);

        const nextId = navigateListByIndex(index);
        if (nextId === undefined) return;
        void router.replace(`/tl/${nextId}`);
      },
      { prevent: true },
    )
    .add(
      "q, a",
      (event) => {
        if (!currentId.value) return;

        const nextId = navigateToNextList(
          currentId.value,
          event.key.toLowerCase() === "q" ? "up" : "down",
        );
        if (nextId !== undefined) {
          void router.replace(`/tl/${nextId}`);
        }
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
