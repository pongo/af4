import { af4 as makeAf4 } from "@/app/model/af4";
import { simple as makeSimple } from "@/app/model/simple";
import { nanoid } from "nanoid";
import type { TaskList, UserAction } from "@/app/types";

const af4 = makeAf4({ generateId: nanoid, now: () => new Date() });
const simple = makeSimple({ generateId: nanoid, now: () => new Date() });

export function dispatch(state: TaskList, action: UserAction): void {
  if (state.system === undefined || state.system === "af4") {
    af4(state, action);
    return;
  }
  if (state.system === "simple") {
    simple(state, action);
    return;
  }
  throw new Error(`Unknown system: ${state.system}`);
}
