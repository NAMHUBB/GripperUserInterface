import liveUiEditorBabelPlugin from './live-ui-editor.babel-plugin.js';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({ babel: { plugins: [liveUiEditorBabelPlugin] } })],
})