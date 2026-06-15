// vite.config.js
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
      },
    }),
  ],
  resolve: {
    alias: [
      // REMOVE THIS BLOCK:
      // {
      //   find: /^.*supabaseClient$/,
      //   replacement: path.resolve(__dirname, "./src/apiClient.js"),
      // },
      
      // KEEP THIS:
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
  assetsInclude: ["**/*.svg"],
  optimizeDeps: {
    include: ["lodash"],
  },
});