import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
// import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";
import versionJson from "./vite-plugins/version-json";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue(), versionJson()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  base: "/af4/",
  build: {
    sourcemap: true,
  },
});
