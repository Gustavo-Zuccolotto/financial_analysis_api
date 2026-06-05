import { Hono } from 'hono'
import { supabase } from '../lib/supabase'
import { requireAdmin } from '../middleware/auth'
import type { HorasProjetoMes, CustoProjetoMes, ConsumoContrato, AlocacaoTimeline, ResumoProjetoKpi, DashboardResponse } from '../lib/types'

const dashboard = new Hono()

dashboard.get('/', requireAdmin, async (c) => {
  const projectId = c.req.query('projectId')
  const yearStr   = c.req.query('year')

  if (!projectId || !yearStr) {
    return c.json({ error: 'projectId and year are required' }, 400)
  }

  const year = parseInt(yearStr, 10)
  if (isNaN(year)) return c.json({ error: 'year must be a number' }, 400)

  // Get project details (needed for contract resolution)
  const { data: projeto, error: projetoError } = await supabase
    .from('projetos')
    .select('id, codigo, empresa_id, area')
    .eq('id', projectId)
    .single()

  if (projetoError || !projeto) {
    return c.json({ error: 'Project not found' }, 404)
  }

  // Run 5 queries in parallel
  const [kpiRes, horasRes, custoRes, timelineRes, contratoRes] = await Promise.all([
    supabase.rpc('get_resumo_projeto', { p_projeto_id: projectId }),
    supabase.from('v_horas_projeto_mes').select('*').eq('projeto_id', projectId).eq('ano', year).order('mes'),
    supabase.from('v_custo_projeto_mes').select('*').eq('projeto_id', projectId).eq('ano', year).order('mes'),
    supabase.from('v_alocacao_timeline').select('*').eq('projeto_id', projectId),
    supabase.from('v_consumo_contrato').select('*')
      .eq('empresa_id', projeto.empresa_id)
      .eq('area', projeto.area)
      .filter('data_inicio', 'lte', `${year}-12-31`)
      .filter('data_fim', 'gte', `${year}-01-01`)
      .limit(1),
  ])

  const response: DashboardResponse = {
    projetos: [],  // not returned here — frontend gets this from /api/projects
    kpi: (kpiRes.data?.[0] ?? null) as ResumoProjetoKpi | null,
    horas: (horasRes.data ?? []) as HorasProjetoMes[],
    custo: (custoRes.data ?? []) as CustoProjetoMes[],
    timeline: (timelineRes.data ?? []) as AlocacaoTimeline[],
    contrato: (contratoRes.data?.[0] ?? null) as ConsumoContrato | null,
  }

  return c.json(response)
})

export default dashboard
