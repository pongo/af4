import { useToggle } from "../../lib/composables/useToggle.ts";

const closedListStyleToggle = useToggle(["outline", "default"]);

export { closedListStyleToggle };
