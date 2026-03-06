import { computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { assert } from "smart-invariant";
import hotkeys from "hotkeys-js";
import { createKeybindingsHandler } from "tinykeys";
import { useTaskListLabels } from "./useTaskListLabels";

export function useNavigationHotkeys() {
  const router = useRouter();
  const route = useRoute();
  const currentId = computed(() => route.params.id as string);
  const { navigateToNextList, navigateListByIndex } = useTaskListLabels();

  const tinykeysHandler = createKeybindingsHandler({
    "Alt+([0-9])": (event) => {
      event.preventDefault();
      event.stopPropagation();
      const num = parseInt(event.key, 10);
      const index = (num === 0 ? 10 : num) - 1;
      assert(index >= 0 && index <= 9);

      const nextId = navigateListByIndex(index);
      if (nextId === undefined) return;
      router.replace(`/tl/${nextId}`);
    },
  });

  onMounted(() => {
    window.addEventListener("keydown", tinykeysHandler);

    hotkeys("q,a", (event, handler): false => {
      if (!currentId.value) return false;

      const nextId = navigateToNextList(currentId.value, handler.key === "q" ? "up" : "down");
      if (nextId !== undefined) {
        router.replace(`/tl/${nextId}`);
      }
      return false;
    });
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", tinykeysHandler);
    hotkeys.unbind("q,a");
  });
}
