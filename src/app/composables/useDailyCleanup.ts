import { onMounted, onUnmounted } from "vue";

const MINUTE = 60 * 1000;

export function useDailyCleanup(runCleanup: () => void) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let checkMissedRunsIntervalId: ReturnType<typeof setInterval> | null = null;
  let lastRun = Date.now();
  let scheduledRunTime = getNextRunDate().getTime();

  function scheduleNextRun() {
    const delay = getTimeUntilNext();
    console.log("scheduleNextRun", getNextRunDate());

    timeoutId = setTimeout(() => {
      run();
      intervalId = setInterval(runCleanup, 24 * 60 * 60 * 1000);
    }, delay);
  }

  function checkMissedRuns() {
    const now = Date.now();
    if (lastRun < scheduledRunTime && now > scheduledRunTime) {
      console.log("Missed scheduled cleanup — running now", new Date());
      run();
    }
  }

  function run() {
    runCleanup();
    lastRun = Date.now();
    scheduledRunTime = getNextRunDate().getTime();
  }

  onMounted(() => {
    scheduleNextRun();
    checkMissedRunsIntervalId = setInterval(checkMissedRuns, MINUTE);
  });

  onUnmounted(() => {
    if (timeoutId) clearTimeout(timeoutId);
    if (intervalId) clearInterval(intervalId);
    if (checkMissedRunsIntervalId) clearInterval(checkMissedRunsIntervalId);
  });
}

function getNextRunDate() {
  const now = new Date();
  const next = new Date();

  // Устанавливаем время на 4:01 утра
  next.setHours(4, 1, 0, 0);

  // Если текущее время уже прошло 4:01 сегодня, то устанавливаем на завтра
  if (now >= next) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function getTimeUntilNext() {
  const now = new Date();
  const next = getNextRunDate();
  return next.getTime() - now.getTime();
}
