import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8082,
  },
  plugins: [
    react(),
    {
      name: "favicon-no-404",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/favicon.ico" || req.url === "/favicon.ico/") {
            res.statusCode = 204;
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
