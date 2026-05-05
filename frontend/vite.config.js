import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // разрешает подключения снаружи контейнера
    port: 5173,
    watch: {
      usePolling: true, // нужно для Windows, чтобы изменения в коде подхватывались сразу
    },
  },
})