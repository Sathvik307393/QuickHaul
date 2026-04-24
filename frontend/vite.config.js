import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api/locations": {
        target: process.env.VITE_LOCATION_SERVICE_URL || "http://127.0.0.1:8001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/locations/, "")
      },
      "/api/auth": {
        target: process.env.VITE_AUTH_SERVICE_URL || "http://127.0.0.1:8002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/auth/, "/auth")
      },
      "/api/bookings": {
        target: process.env.VITE_BOOKING_SERVICE_URL || "http://127.0.0.1:8003",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bookings/, "")
      },
      "/api/notifications": {
        target: process.env.VITE_NOTIFICATION_SERVICE_URL || "http://127.0.0.1:8004",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/notifications/, "")
      },
      "/api/otp": {
        target: process.env.VITE_OTP_SERVICE_URL || "http://127.0.0.1:8005",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/otp/, "")
      }
    },
    hmr: {
      host: process.env.VITE_HMR_HOST || "localhost",
    }
  }
});
