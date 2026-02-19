import { shallowRef } from "vue";

const MINUTE = 60 * 1000;
const HOUR = 60 * 60 * 1000;
export const globalNow = shallowRef(new Date());
let lastUpdate = Date.now();

function updateGlobalNow() {
  globalNow.value = new Date();
  lastUpdate = Date.now();
  console.log("updateGlobalNow", globalNow.value);
}

function getTimeToNextHour() {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  return nextHour.getTime() - now.getTime();
}

function startHourlyUpdates() {
  console.log("startHourlyUpdates", new Date(getTimeToNextHour() + Date.now()));
  setTimeout(() => {
    updateGlobalNow();
    setInterval(updateGlobalNow, HOUR);
  }, getTimeToNextHour());
}

function checkMissedUpdates() {
  const now = Date.now();
  if (now - lastUpdate > HOUR + 10_000) {
    console.log("Missed update detected! Running update immediately.");
    updateGlobalNow();
  }
}

startHourlyUpdates();

setInterval(checkMissedUpdates, MINUTE);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    checkMissedUpdates();
  }
});
