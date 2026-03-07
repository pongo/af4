import { af4 as makeAf4 } from "@/app/model/af4";
import { simple as makeSimple } from "@/app/model/simple";
import { nanoid } from "nanoid";
import type { TaskList, UserAction } from "@/app/types";
import { assertUnreachable } from "@/lib/utils.ts";

const af4 = makeAf4({ generateId: nanoid, now: () => new Date() });
const simple = makeSimple({ generateId: nanoid, now: () => new Date() });

export function dispatch(state: TaskList, action: UserAction): void {
  switch (state.system) {
    case undefined:
    case "af4":
      af4(state, action);
      break;
    case "simple":
      simple(state, action);
      break;
    default:
      assertUnreachable("Unknown system: ", state.system);
  }
}
