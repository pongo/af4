import { describe, expect, it } from "vitest";
import { useToggle } from "./useToggle.ts";

describe("useToggle", () => {
  it("returns the first value initially and cycles through values", () => {
    const toggle = useToggle(["first", "second", "third"] as const);

    expect(toggle.currentValue.value).toBe("first");

    toggle.next();
    expect(toggle.currentValue.value).toBe("second");

    toggle.next();
    expect(toggle.currentValue.value).toBe("third");

    toggle.next();
    expect(toggle.currentValue.value).toBe("first");
  });
});
