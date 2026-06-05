import { Hono } from 'hono'
import { supabase } from '../lib/supabase'
import { requireAdmin } from '../middleware/auth'
import type { Empresa, ConsumoContrato } from '../lib/types'

const empresas = new Hono()

empresas.get('/', requireAdmin, async (c) => {
  const [empresasRes, consumosRes] = await Promise.all([
    supabase.from('empresas').select('*').order('nome'),
    supabase.from('v_consumo_contrato').select('*'),
  ])

  if (empresasRes.error) return c.json({ error: empresasRes.error.message }, 500)

  const consumos = (consumosRes.data ?? []) as ConsumoContrato[]

  const result = (empresasRes.data as Empresa[]).map(e => {
    const contratos = consumos.filter(ct => ct.empresa_id === e.id)
    const totalGasto = contratos.reduce((s, ct) => s + ct.total_gasto, 0)
    const totalCota  = contratos.reduce((s, ct) => s + ct.valor_cota, 0)
    return {
      ...e,
      contratos_count: contratos.length,
      consumo_percentual: totalCota > 0
        ? Math.round((totalGasto / totalCota) * 100 * 100) / 100
        : 0,
    }
  })

  return c.json(result)
})

export default empresas
