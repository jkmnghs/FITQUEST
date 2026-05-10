import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function devApiPlugin() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const route = req.url.slice(5).split('?')[0]
        const handlerUrl = new URL(`api/${route}.js`, import.meta.url).href
        let body = ''
        req.on('data', chunk => (body += chunk))
        req.on('end', async () => {
          try { req.body = body ? JSON.parse(body) : {} } catch { req.body = {} }
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          }
          try {
            // Cache-bust on every request so edits to api/ files take effect without restart
            const mod = await import(handlerUrl + `?t=${Date.now()}`)
            await mod.default(req, res)
          } catch (err) {
            console.error('[dev-api]', err.message)
            next()
          }
        })
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)
  return {
    plugins: [react(), devApiPlugin()],
    server: { port: 3000, host: true },
    test: {
      environment: 'node',
      globals: true,
    },
  }
})
