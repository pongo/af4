import { useToggle } from "./shared/composables/useToggle.ts";

const itemIconPosToggle = useToggle(["out", "in"]);

export { itemIconPosToggle };
