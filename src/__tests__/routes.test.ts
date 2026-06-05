// Env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NODE_ENV=test) are set
// in jest.env.ts (setupFiles) before any module is loaded.

// Prevent @hono/node-server from binding a real TCP port during tests.
jest.mock('@hono/node-server', () => ({ serve: jest.fn() }))

import { supabase } from '../lib/supabase'

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}))

jest.mock('../middleware/auth', () => ({
  authMiddleware: (c: any, next: any) => {
    c.set('userId', 'test-member-id')
    c.set('authUid', 'test-auth-uid')
    c.set('isAdmin', true)
    return next()
  },
  requireAdmin: (c: any, next: any) => next(),
}))

import app from '../index'

const mockSupabase = supabase as jest.Mocked<typeof supabase>

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── GET /health ───────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 { ok: true }', async () => {
    const res = await app.request('/health')
    const json = await res.json() as any
    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
  })
})

// ─── GET /api/projects ────────────────────────────────────────────────────────

describe('GET /api/projects', () => {
  it('returns project list', async () => {
    const projects = [
      { id: 'p1', codigo: 'PROJ-001', empresa_id: 'e1', area: 'TI' },
      { id: 'p2', codigo: 'PROJ-002', empresa_id: 'e1', area: 'TI' },
    ]
    const mockOrder = jest.fn().mockResolvedValue({ data: projects, error: null })
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
    mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

    const res = await app.request('/api/projects')
    const json = await res.json() as any
    expect(res.status).toBe(200)
    expect(json).toEqual(projects)
    expect(mockSupabase.from).toHaveBeenCalledWith('projetos')
  })

  it('returns 500 when Supabase returns an error', async () => {
    const mockOrder = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
    mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

    const res = await app.request('/api/projects')
    expect(res.status).toBe(500)
  })
})

// ─── GET /api/dashboard ───────────────────────────────────────────────────────

describe('GET /api/dashboard', () => {
  it('returns 400 when projectId is missing', async () => {
    const res = await app.request('/api/dashboard?year=2025')
    const json = await res.json() as any
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/required/)
  })

  it('returns 400 when year is missing', async () => {
    const res = await app.request('/api/dashboard?projectId=p1')
    const json = await res.json() as any
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/required/)
  })

  it('returns dashboard data when both params are provided', async () => {
    const projeto = { id: 'p1', codigo: 'PROJ-001', empresa_id: 'e1', area: 'TI' }

    const kpiData = [{
      total_horas_planejadas: 100,
      total_horas_reais: 90,
      desvio_percentual: -10,
      total_custo_planejado: 10000,
      total_custo_real: 9000,
      consumo_contrato_percentual: 80,
    }]

    const horasData = [{ projeto_id: 'p1', ano: 2025, mes: 1, horas_planejadas: 10, horas_reais: 9 }]
    const custoData = [{ projeto_id: 'p1', ano: 2025, mes: 1, custo_planejado: 1000, custo_real: 900 }]
    const timelineData = [{
      id: 't1', projeto_id: 'p1', membro_id: 'm1', membro_nome: 'Alice',
      membro_sigla: 'A', data_inicio: '2025-01-01', data_fim: '2025-12-31', horas_semana: 20,
    }]
    const contratoData = [{
      contrato_id: 'c1', empresa_id: 'e1', area: 'TI',
      data_inicio: '2025-01-01', data_fim: '2025-12-31',
      valor_cota: 100000, total_gasto: 80000, percentual_consumido: 80,
    }]

    mockSupabase.rpc.mockResolvedValue({ data: kpiData, error: null } as any)

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'projetos') {
        // Route does: .select(...).eq('id', projectId).single()
        const mockSingle = jest.fn().mockResolvedValue({ data: projeto, error: null })
        const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
        return { select: mockSelect } as any
      }
      if (table === 'v_horas_projeto_mes') {
        const mockOrder = jest.fn().mockResolvedValue({ data: horasData, error: null })
        const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder })
        const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })
        return { select: mockSelect } as any
      }
      if (table === 'v_custo_projeto_mes') {
        const mockOrder = jest.fn().mockResolvedValue({ data: custoData, error: null })
        const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder })
        const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })
        return { select: mockSelect } as any
      }
      if (table === 'v_alocacao_timeline') {
        const mockEq = jest.fn().mockResolvedValue({ data: timelineData, error: null })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
        return { select: mockSelect } as any
      }
      if (table === 'v_consumo_contrato') {
        const mockLimit = jest.fn().mockResolvedValue({ data: contratoData, error: null })
        const mockFilter2 = jest.fn().mockReturnValue({ limit: mockLimit })
        const mockFilter1 = jest.fn().mockReturnValue({ filter: mockFilter2 })
        const mockEq2 = jest.fn().mockReturnValue({ filter: mockFilter1 })
        const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })
        return { select: mockSelect } as any
      }
      return { select: jest.fn() } as any
    })

    const res = await app.request('/api/dashboard?projectId=p1&year=2025')
    const json = await res.json() as any
    expect(res.status).toBe(200)
    expect(json.kpi).toEqual(kpiData[0])
    expect(json.horas).toEqual(horasData)
    expect(json.custo).toEqual(custoData)
    expect(json.timeline).toEqual(timelineData)
    expect(json.contrato).toEqual(contratoData[0])
  })
})

// ─── GET /api/member-dashboard ────────────────────────────────────────────────

describe('GET /api/member-dashboard', () => {
  it('returns 400 when year is missing', async () => {
    const res = await app.request('/api/member-dashboard')
    const json = await res.json() as any
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/year/)
  })

  it('returns aggregated member data when year is provided', async () => {
    const membroData = { id: 'test-member-id', nome: 'Test Member' }
    const horasData = [
      { membro_id: 'test-member-id', projeto_id: 'p1', projeto_codigo: 'P1', ano: 2025, mes: 1, horas_planejadas: 10, horas_reais: 9 },
      { membro_id: 'test-member-id', projeto_id: 'p2', projeto_codigo: 'P2', ano: 2025, mes: 1, horas_planejadas: 20, horas_reais: 18 },
    ]
    const alocacaoData = [
      {
        id: 'a1', membro_id: 'test-member-id', projeto_id: 'p1',
        data_inicio: '2025-01-01', data_fim: null, horas_semana: 20,
        projetos: { codigo: 'PROJ-001' },
      },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'membros') {
        const mockSingle = jest.fn().mockResolvedValue({ data: membroData, error: null })
        const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
        return { select: mockSelect } as any
      }
      if (table === 'v_horas_membro_mes') {
        const mockOrder = jest.fn().mockResolvedValue({ data: horasData, error: null })
        const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder })
        const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })
        return { select: mockSelect } as any
      }
      if (table === 'alocacao') {
        const mockOrder = jest.fn().mockResolvedValue({ data: alocacaoData, error: null })
        const mockEq = jest.fn().mockReturnValue({ order: mockOrder })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
        return { select: mockSelect } as any
      }
      return { select: jest.fn() } as any
    })

    const res = await app.request('/api/member-dashboard?year=2025')
    const json = await res.json() as any
    expect(res.status).toBe(200)
    expect(json.membro).toEqual({ id: 'test-member-id', nome: 'Test Member' })
    // Both rows are in the same month (mes=1) — they should be aggregated into one entry
    expect(json.horas).toHaveLength(1)
    expect(json.horas[0].horas_planejadas).toBe(30)
    expect(json.horas[0].horas_reais).toBe(27)
    expect(json.alocacoes).toHaveLength(1)
    expect(json.alocacoes[0].projeto_codigo).toBe('PROJ-001')
  })
})

// ─── GET /api/empresas ────────────────────────────────────────────────────────

describe('GET /api/empresas', () => {
  it('returns enriched company list', async () => {
    const empresasData = [
      { id: 'e1', nome: 'Empresa A', sigla: 'EA' },
      { id: 'e2', nome: 'Empresa B', sigla: 'EB' },
    ]
    const consumosData = [
      {
        contrato_id: 'c1', empresa_id: 'e1', area: 'TI',
        data_inicio: '2025-01-01', data_fim: '2025-12-31',
        valor_cota: 100000, total_gasto: 50000, percentual_consumido: 50,
      },
      {
        contrato_id: 'c2', empresa_id: 'e1', area: 'TI',
        data_inicio: '2025-01-01', data_fim: '2025-12-31',
        valor_cota: 50000, total_gasto: 25000, percentual_consumido: 50,
      },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'empresas') {
        const mockOrder = jest.fn().mockResolvedValue({ data: empresasData, error: null })
        const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
        return { select: mockSelect } as any
      }
      if (table === 'v_consumo_contrato') {
        const mockSelect = jest.fn().mockResolvedValue({ data: consumosData, error: null })
        return { select: mockSelect } as any
      }
      return { select: jest.fn() } as any
    })

    const res = await app.request('/api/empresas')
    const json = await res.json() as any
    expect(res.status).toBe(200)
    expect(json).toHaveLength(2)

    const ea = json.find((e: any) => e.id === 'e1')
    expect(ea.contratos_count).toBe(2)
    // (50000 + 25000) / (100000 + 50000) * 100 = 50%
    expect(ea.consumo_percentual).toBe(50)

    const eb = json.find((e: any) => e.id === 'e2')
    expect(eb.contratos_count).toBe(0)
    expect(eb.consumo_percentual).toBe(0)
  })
})

// ─── GET /api/form-data ───────────────────────────────────────────────────────

describe('GET /api/form-data', () => {
  it('returns { membros, projetos }', async () => {
    const membrosData = [{ id: 'm1', nome: 'Alice', sigla: 'A' }]
    const projetosData = [{ id: 'p1', codigo: 'PROJ-001' }]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'membros') {
        const mockOrder = jest.fn().mockResolvedValue({ data: membrosData, error: null })
        const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
        return { select: mockSelect } as any
      }
      if (table === 'projetos') {
        const mockOrder = jest.fn().mockResolvedValue({ data: projetosData, error: null })
        const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
        return { select: mockSelect } as any
      }
      return { select: jest.fn() } as any
    })

    const res = await app.request('/api/form-data')
    const json = await res.json() as any
    expect(res.status).toBe(200)
    expect(json).toEqual({ membros: membrosData, projetos: projetosData })
  })
})

// ─── POST /api/alocacao ───────────────────────────────────────────────────────

describe('POST /api/alocacao', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await app.request('/api/alocacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membro_id: 'm1' }), // missing projeto_id, data_inicio, horas_semana
    })
    const json = await res.json() as any
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/required/)
  })

  it('returns 201 on success', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValue({ insert: mockInsert } as any)

    const res = await app.request('/api/alocacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        membro_id: 'm1',
        projeto_id: 'p1',
        data_inicio: '2025-01-01',
        horas_semana: 20,
      }),
    })
    const json = await res.json() as any
    expect(res.status).toBe(201)
    expect(json).toEqual({ ok: true })
    expect(mockSupabase.from).toHaveBeenCalledWith('alocacao')
  })

  it('returns 500 when Supabase insert fails', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: { message: 'constraint violation' } })
    mockSupabase.from.mockReturnValue({ insert: mockInsert } as any)

    const res = await app.request('/api/alocacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        membro_id: 'm1',
        projeto_id: 'p1',
        data_inicio: '2025-01-01',
        horas_semana: 20,
      }),
    })
    expect(res.status).toBe(500)
  })
})

// ─── POST /api/clockify-sync ──────────────────────────────────────────────────

describe('POST /api/clockify-sync', () => {
  it('returns 500 when CLOCKIFY_API_KEY and CLOCKIFY_WORKSPACE_ID are not set', async () => {
    const savedApiKey = process.env.CLOCKIFY_API_KEY
    const savedWorkspaceId = process.env.CLOCKIFY_WORKSPACE_ID
    delete process.env.CLOCKIFY_API_KEY
    delete process.env.CLOCKIFY_WORKSPACE_ID

    const res = await app.request('/api/clockify-sync', { method: 'POST' })
    const json = await res.json() as any
    expect(res.status).toBe(500)
    expect(json.error).toMatch(/CLOCKIFY/)

    // Restore env vars
    if (savedApiKey !== undefined) process.env.CLOCKIFY_API_KEY = savedApiKey
    if (savedWorkspaceId !== undefined) process.env.CLOCKIFY_WORKSPACE_ID = savedWorkspaceId
  })
})
