import { ref } from "vue";

const HOUR = 60 * 60 * 1000;
export const globalNow = ref(new Date());

function updateGlobalNow() {
  globalNow.value = new Date();
}

function getTimeToNextHour() {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  return nextHour.getTime() - now.getTime();
}

function startHourlyUpdates() {
  setTimeout(() => {
    updateGlobalNow();
    setInterval(updateGlobalNow, HOUR);
  }, getTimeToNextHour());
}

startHourlyUpdates();
