import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-assets',
      closeBundle() {
        copyFileSync(
          resolve(__dirname, 'public/manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        )
        console.log('✓ manifest.json copiado a dist/')

        const iconsSource = resolve(__dirname, 'public/icons')
        const iconsDest = resolve(__dirname, 'dist/icons')
        if (existsSync(iconsSource)) {
          mkdirSync(iconsDest, { recursive: true })
          readdirSync(iconsSource).forEach(icon => {
            copyFileSync(
              resolve(__dirname, `public/icons/${icon}`),
              resolve(__dirname, `dist/icons/${icon}`)
            )
          })
          console.log('✓ íconos copiados a dist/')
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.js'),
        content: resolve(__dirname, 'src/content.js'),
      },
      output: {
        entryFileNames: '[name].js',
      }
    }
  }
})