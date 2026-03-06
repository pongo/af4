import "@/app/styles/main.css";

import { createApp } from "vue";
import App from "@/app/App.vue";
import router from "@/app/router.ts";
import { useTaskListLabels } from "./app/composables/useTaskListLabels.ts";

async function bootstrap() {
  await useTaskListLabels().updateTaskListLabels();

  const app = createApp(App);

  app.use(router);

  await router.isReady();

  app.mount("#app");
}

bootstrap();
