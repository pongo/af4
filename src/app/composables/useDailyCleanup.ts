import { onMounted, onUnmounted } from "vue";

export function useDailyCleanup(runCleanup: () => void) {
  let timeoutId: number | null = null;
  let intervalId: number | null = null;

  function scheduleNextRun() {
    const delay = getTimeUntilNext();

    timeoutId = setTimeout(() => {
      runCleanup();
      intervalId = setInterval(runCleanup, 24 * 60 * 60 * 1000);
    }, delay);
  }

  onMounted(() => {
    scheduleNextRun();
  });

  onUnmounted(() => {
    if (timeoutId) clearTimeout(timeoutId);
    if (intervalId) clearInterval(intervalId);
  });
}

function getTimeUntilNext() {
  const now = new Date();
  const next = new Date();

  // Устанавливаем время на 4:01 утра
  next.setHours(4, 1, 0, 0);

  // Если текущее время уже прошло 4:01 сегодня, то устанавливаем на завтра
  if (now >= next) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}
