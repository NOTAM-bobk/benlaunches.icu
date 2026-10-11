import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import reactRouter from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { devApi } from "./scripts/dev-api.ts";

export default defineConfig({
  plugins: [tailwindcss(), react(), reactRouter(), devApi()],
  base: "/",
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
  },
  server: {
    host: true,
    strictPort: true,
    hmr: false,
    ...(process.env.BASE44_PREVIEW_MODE === "1" && process.env.BASE44_SANDBOX_HOST_DOMAIN
      ? { allowedHosts: [`.${process.env.BASE44_SANDBOX_HOST_DOMAIN}`] }
      : {}),
  },
});
