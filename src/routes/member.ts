import { Hono } from 'hono'
import { supabase } from '../lib/supabase'
import type { HorasMembroMes, Alocacao, MemberDashboardResponse } from '../lib/types'

const member = new Hono()

member.get('/', async (c) => {
  const userId  = c.get('userId')   // membros.id
  const yearStr = c.req.query('year')

  if (!yearStr) return c.json({ error: 'year is required' }, 400)
  const year = parseInt(yearStr, 10)
  if (isNaN(year)) return c.json({ error: 'year must be a number' }, 400)

  const [membroRes, horasRes, alocacaoRes] = await Promise.all([
    supabase.from('membros').select('id, nome').eq('id', userId).single(),
    supabase.from('v_horas_membro_mes').select('*').eq('membro_id', userId).eq('ano', year).order('mes'),
    supabase.from('alocacao')
      .select('id, membro_id, projeto_id, data_inicio, data_fim, horas_semana, projetos(codigo)')
      .eq('membro_id', userId)
      .order('data_inicio', { ascending: false }),
  ])

  if (membroRes.error || !membroRes.data) {
    return c.json({ error: 'Member not found' }, 404)
  }

  // v_horas_membro_mes is per (member, project, month) — aggregate to per-month
  const horasBruto = (horasRes.data ?? []) as HorasMembroMes[]
  const horasPorMes = new Map<string, HorasMembroMes>()
  for (const h of horasBruto) {
    const key = `${h.ano}-${h.mes}`
    const existing = horasPorMes.get(key)
    if (existing) {
      existing.horas_planejadas += h.horas_planejadas
      existing.horas_reais      += h.horas_reais
    } else {
      horasPorMes.set(key, { ...h })
    }
  }
  const horas = Array.from(horasPorMes.values()).sort((a, b) => a.mes - b.mes)

  // NOTE: `any` cast is unavoidable here — Supabase does not infer nested join types
  const alocacoes = (alocacaoRes.data ?? []).map((a: any) => ({
    ...a,
    projeto_codigo: (a.projetos as { codigo: string } | null)?.codigo ?? '—',
    projetos: undefined,
  })) as (Alocacao & { projeto_codigo: string })[]

  const response: MemberDashboardResponse = {
    membro: { id: membroRes.data.id, nome: membroRes.data.nome },
    horas,
    alocacoes,
  }

  return c.json(response)
})

export default member
