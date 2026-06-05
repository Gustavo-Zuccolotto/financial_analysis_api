import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { authMiddleware } from './middleware/auth'
import projects from './routes/projects'

const app = new Hono()

app.use('*', cors({ origin: process.env.CORS_ORIGIN ?? '*' }))

app.get('/health', (c) => c.json({ ok: true }))

// Apply auth middleware to all /api/* routes
app.use('/api/*', authMiddleware)

// Mount sub-routers
app.route('/api/projects', projects)

// Bind HTTP server for local development
if (process.env.NODE_ENV !== 'production') {
  serve({ fetch: app.fetch, port: 3001 }, () =>
    console.log('API listening on http://localhost:3001')
  )
}

export default app
