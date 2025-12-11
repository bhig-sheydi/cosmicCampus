import path from "path";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // optional: make all SVGs accessible via both ?url and ?react
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  assetsInclude: ["**/*.svg"],
});
