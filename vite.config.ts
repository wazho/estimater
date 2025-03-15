import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 判斷是否為 GitHub Pages 或本地
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  plugins: [
    react(),
  ],
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: {
          'primary-color': '#1890ff',
          'border-radius-base': '4px',
          'layout-body-background': '#141414',
          'component-background': '#1f1f1f',
          'text-color': '#ffffff',
        },
        javascriptEnabled: true,
      },
    },
  },
  base: isGitHubPages ? '/estimater/' : './',
});
