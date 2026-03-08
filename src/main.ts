import "@/app/styles/main.css";

import { createApp } from "vue";
import App from "@/app/App.vue";
import router from "@/app/router.ts";
import { db } from "@/app/db.ts";

async function bootstrap() {
  await db.updateTaskListLabels();

  const app = createApp(App);

  app.use(router);

  await router.isReady();

  app.mount("#app");
}

bootstrap().catch(console.error);
