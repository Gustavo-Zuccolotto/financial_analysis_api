import { Hono } from 'hono'
import { supabase } from '../lib/supabase'
import { requireAdmin } from '../middleware/auth'

const formData = new Hono()

formData.get('/', requireAdmin, async (c) => {
  const [membrosRes, projetosRes] = await Promise.all([
    supabase.from('membros').select('id, nome, sigla').order('nome'),
    supabase.from('projetos').select('id, codigo').order('codigo'),
  ])

  if (membrosRes.error) return c.json({ error: membrosRes.error.message }, 500)
  if (projetosRes.error) return c.json({ error: projetosRes.error.message }, 500)

  return c.json({
    membros: membrosRes.data,
    projetos: projetosRes.data,
  })
})

export default formData
