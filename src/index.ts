import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { authMiddleware } from './middleware/auth'
import projects  from './routes/projects'
import dashboard from './routes/dashboard'
import member    from './routes/member'
import empresas  from './routes/empresas'
import contratos from './routes/contratos'
import formData  from './routes/formData'

const app = new Hono()

app.use('*', cors({ origin: process.env.CORS_ORIGIN ?? '*' }))

app.get('/health', (c) => c.json({ ok: true }))

// Apply auth middleware to all /api/* routes
app.use('/api/*', authMiddleware)

// Mount sub-routers
app.route('/api/projects', projects)
app.route('/api/dashboard', dashboard)
app.route('/api/member-dashboard', member)
app.route('/api/empresas',   empresas)
app.route('/api/contratos',  contratos)
app.route('/api/form-data',  formData)

// Bind HTTP server for local development
if (process.env.NODE_ENV !== 'production') {
  serve({ fetch: app.fetch, port: 3001 }, () =>
    console.log('API listening on http://localhost:3001')
  )
}

export default app
