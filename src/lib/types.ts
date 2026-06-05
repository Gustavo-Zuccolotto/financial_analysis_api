export type Empresa = { id: string; nome: string; sigla: string }

export type Contrato = {
  id: string; empresa_id: string; area: string
  data_inicio: string; data_fim: string
  valor_cota: number; horas_semana: number
}

export type Projeto = {
  id: string; codigo: string; empresa_id: string; area: string
  clockify_project_id: string | null
}

export type Membro = {
  id: string; sigla: string; nome: string
  auth_user_id: string | null; is_admin: boolean
  clockify_user_id: string | null
}

export type Alocacao = {
  id: string; membro_id: string; projeto_id: string
  data_inicio: string; data_fim: string | null; horas_semana: number
}

// View result types
export type HorasProjetoMes = {
  projeto_id: string; ano: number; mes: number
  horas_planejadas: number; horas_reais: number
}

export type CustoProjetoMes = {
  projeto_id: string; ano: number; mes: number
  custo_planejado: number; custo_real: number
}

export type ConsumoContrato = {
  contrato_id: string; empresa_id: string; area: string
  data_inicio: string; data_fim: string
  valor_cota: number; total_gasto: number; percentual_consumido: number
}

export type AlocacaoTimeline = {
  id: string; projeto_id: string; membro_id: string
  membro_nome: string; membro_sigla: string
  data_inicio: string; data_fim: string; horas_semana: number
}

export type HorasMembroMes = {
  membro_id: string; projeto_id: string; projeto_codigo: string
  ano: number; mes: number
  horas_planejadas: number; horas_reais: number
}

export type ResumoProjetoKpi = {
  total_horas_planejadas: number; total_horas_reais: number
  desvio_percentual: number
  total_custo_planejado: number; total_custo_real: number
  consumo_contrato_percentual: number | null
}

export type DashboardResponse = {
  projetos: Pick<Projeto, 'id' | 'codigo' | 'empresa_id' | 'area'>[]
  kpi: ResumoProjetoKpi | null
  horas: HorasProjetoMes[]
  custo: CustoProjetoMes[]
  timeline: AlocacaoTimeline[]
  contrato: ConsumoContrato | null
}

export type MemberDashboardResponse = {
  membro: { id: string; nome: string }
  horas: HorasMembroMes[]  // already aggregated by month
  alocacoes: (Alocacao & { projeto_codigo: string })[]
}
