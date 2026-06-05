import { Hono } from 'hono'
import { supabase } from '../lib/supabase'
import { requireAdmin } from '../middleware/auth'

const projects = new Hono()

// GET /api/projects — list all projects (admin only)
projects.get('/', requireAdmin, async (c) => {
  const { data, error } = await supabase
    .from('projetos')
    .select('id, codigo, empresa_id, area')
    .order('codigo')

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

export default projects
