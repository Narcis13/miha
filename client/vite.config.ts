import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
	plugins: [
		// Please make sure that '@tanstack/router-plugin' is passed before '@vitejs/plugin-react'
    tanstackRouter({
      target: "react",
      autoCodeSplitting: false,
    }),
		react(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		proxy: {
			'/beneficiaries': 'http://localhost:3765',
			'/payment-packages': 'http://localhost:3765',
			'/payments': 'http://localhost:3765',
			'/settings': 'http://localhost:3765',
		},
	},
});
