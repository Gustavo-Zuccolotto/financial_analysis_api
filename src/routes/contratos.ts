import { Hono } from 'hono'
import { supabase } from '../lib/supabase'
import { requireAdmin } from '../middleware/auth'
import type { Empresa, ConsumoContrato } from '../lib/types'

const contratos = new Hono()

contratos.get('/', requireAdmin, async (c) => {
  const [consumosRes, empresasRes] = await Promise.all([
    supabase.from('v_consumo_contrato').select('*').order('data_inicio', { ascending: false }),
    supabase.from('empresas').select('id, nome, sigla'),
  ])

  if (consumosRes.error) return c.json({ error: consumosRes.error.message }, 500)

  const empresaMap = new Map(
    (empresasRes.data as Pick<Empresa, 'id' | 'nome' | 'sigla'>[] ?? []).map(e => [e.id, e])
  )

  const result = (consumosRes.data as ConsumoContrato[]).map(ct => ({
    ...ct,
    empresa_nome: empresaMap.get(ct.empresa_id)?.nome ?? '—',
    empresa_sigla: empresaMap.get(ct.empresa_id)?.sigla ?? '—',
  }))

  return c.json(result)
})

export default contratos
