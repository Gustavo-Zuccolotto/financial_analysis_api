import { Hono } from 'hono'
import { supabase } from '../lib/supabase'
import { requireAdmin } from '../middleware/auth'

const alocacao = new Hono()

alocacao.post('/', requireAdmin, async (c) => {
  const body = await c.req.json()
  const { membro_id, projeto_id, data_inicio, data_fim, horas_semana } = body

  if (!membro_id || !projeto_id || !data_inicio || !horas_semana) {
    return c.json({ error: 'membro_id, projeto_id, data_inicio, and horas_semana are required' }, 400)
  }

  const { error } = await supabase.from('alocacao').insert({
    membro_id,
    projeto_id,
    data_inicio,
    data_fim: data_fim ?? null,
    horas_semana,
  })

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true }, 201)
})

export default alocacao
