import { useToggle } from "../../lib/composables/useToggle.ts";

const itemIconPosToggle = useToggle(["out", "in"]);

export { itemIconPosToggle };
