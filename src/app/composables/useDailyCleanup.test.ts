import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDailyCleanup } from "./useDailyCleanup.ts";

function mountHarness(runCleanup: () => void) {
  return mount(
    defineComponent({
      setup() {
        useDailyCleanup(runCleanup);
        return () => h("div");
      },
    }),
  );
}

describe("useDailyCleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("runs cleanup at 04:01 when mounted before the scheduled time", () => {
    vi.setSystemTime(new Date(2026, 5, 10, 3, 0, 0, 0));
    const runCleanup = vi.fn();

    mountHarness(runCleanup);

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(runCleanup).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60 * 1000);
    expect(runCleanup).toHaveBeenCalledTimes(1);
  });

  it("schedules cleanup for the next day when mounted after 04:01", () => {
    vi.setSystemTime(new Date(2026, 5, 10, 5, 0, 0, 0));
    const runCleanup = vi.fn();

    mountHarness(runCleanup);

    vi.advanceTimersByTime(23 * 60 * 60 * 1000);
    expect(runCleanup).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60 * 1000);
    expect(runCleanup).toHaveBeenCalledTimes(1);
  });

  it("runs cleanup when a scheduled run was missed", () => {
    vi.setSystemTime(new Date(2026, 5, 10, 3, 59, 0, 0));
    const runCleanup = vi.fn();

    mountHarness(runCleanup);

    vi.setSystemTime(new Date(2026, 5, 10, 4, 2, 0, 0));
    vi.advanceTimersByTime(60 * 1000);

    expect(runCleanup).toHaveBeenCalledTimes(1);
  });

  it("clears scheduled timers on unmount", () => {
    vi.setSystemTime(new Date(2026, 5, 10, 3, 0, 0, 0));
    const runCleanup = vi.fn();

    const wrapper = mountHarness(runCleanup);
    wrapper.unmount();

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);

    expect(runCleanup).not.toHaveBeenCalled();
  });
});
