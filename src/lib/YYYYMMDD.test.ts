import { describe, expect, it } from "vitest";
import { YYYYMMDD } from "./YYYYMMDD.ts";

describe("YYYYMMDD", () => {
  it("formats dates with zero-padded month and day", () => {
    expect(YYYYMMDD(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("formats double-digit month and day", () => {
    expect(YYYYMMDD(new Date(2026, 10, 15))).toBe("2026-11-15");
  });
});
