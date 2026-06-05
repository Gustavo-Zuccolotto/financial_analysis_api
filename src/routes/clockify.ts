import { Hono } from 'hono'
import { supabase } from '../lib/supabase'
import { requireAdmin } from '../middleware/auth'

const CLOCKIFY_BASE = 'https://api.clockify.me/api/v1'
const PAGE_SIZE     = 500

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/)
  if (!match) return 0
  const h = parseFloat(match[1] || '0')
  const m = parseFloat(match[2] || '0')
  const s = parseFloat(match[3] || '0')
  return h + m / 60 + s / 3600
}

async function fetchUserEntries(
  apiKey: string,
  workspaceId: string,
  userId: string,
  start: string
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let page = 1
  while (true) {
    const url =
      `${CLOCKIFY_BASE}/workspaces/${workspaceId}/user/${userId}/time-entries` +
      `?start=${start}&page-size=${PAGE_SIZE}&page=${page}`
    const res = await fetch(url, { headers: { 'X-Api-Key': apiKey } })
    if (!res.ok) break
    const batch = await res.json() as Record<string, unknown>[]
    all.push(...batch)
    if (batch.length < PAGE_SIZE) break
    page++
  }
  return all
}

const clockify = new Hono()

clockify.post('/', requireAdmin, async (c) => {
  const apiKey      = process.env.CLOCKIFY_API_KEY
  const workspaceId = process.env.CLOCKIFY_WORKSPACE_ID

  if (!apiKey || !workspaceId) {
    return c.json({ error: 'CLOCKIFY_API_KEY ou CLOCKIFY_WORKSPACE_ID não configurados.' }, 500)
  }

  const [membrosRes, projetosRes] = await Promise.all([
    supabase.from('membros').select('id, clockify_user_id'),
    supabase.from('projetos').select('id, clockify_project_id'),
  ])

  if (membrosRes.error || projetosRes.error) {
    return c.json({ error: 'Erro ao buscar membros ou projetos do banco.' }, 500)
  }

  const membroMap  = new Map(membrosRes.data?.map(m => [m.clockify_user_id,  m.id]) ?? [])
  const projetoMap = new Map(projetosRes.data?.map(p => [p.clockify_project_id, p.id]) ?? [])

  const start = new Date()
  start.setDate(start.getDate() - 90)
  const startIso = start.toISOString()

  const userIds = membrosRes.data
    ?.map(m => m.clockify_user_id)
    .filter((id): id is string => Boolean(id)) ?? []

  const allEntries = (
    await Promise.all(userIds.map(uid => fetchUserEntries(apiKey, workspaceId, uid, startIso)))
  ).flat()

  const rows = allEntries
    .filter(e => {
      const interval = e.timeInterval as Record<string, unknown> | undefined
      return interval?.duration &&
        membroMap.has(e.userId as string) &&
        projetoMap.has(e.projectId as string)
    })
    .map(e => {
      const interval = e.timeInterval as Record<string, string>
      return {
        clockify_entry_id: e.id as string,
        membro_id:         membroMap.get(e.userId as string)!,
        projeto_id:        projetoMap.get(e.projectId as string)!,
        data:              interval.start.slice(0, 10),
        horas_reais:       Math.round(parseDuration(interval.duration) * 100) / 100,
      }
    })

  if (rows.length === 0) {
    return c.json({ synced: 0, message: 'Nenhuma entrada correspondente encontrada.' })
  }

  const { error, count } = await supabase
    .from('clockify')
    .upsert(rows, { onConflict: 'clockify_entry_id', count: 'exact' })

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ synced: count ?? 0, timestamp: new Date().toISOString() })
})

export default clockify
