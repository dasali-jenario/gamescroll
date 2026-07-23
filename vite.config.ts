import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { randomUUID } from 'node:crypto'

function buildVersionPlugin(buildId: string, emit: boolean): Plugin {
  return {
    name: 'gamescroll-build-version',
    generateBundle() {
      if (!emit) return
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({
          id: buildId,
          builtAt: new Date().toISOString(),
        }),
      })
    },
  }
}

export default defineConfig(({ command }) => {
  const isBuild = command === 'build'
  const buildId = isBuild
    ? `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`
    : 'dev'

  return {
    plugins: [react(), buildVersionPlugin(buildId, isBuild)],
    define: {
      __BUILD_ID__: JSON.stringify(buildId),
    },
  }
})
