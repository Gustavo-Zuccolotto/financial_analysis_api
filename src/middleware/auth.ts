import type { Context, Next } from 'hono'
import { supabase } from '../lib/supabase'

// Augment Hono context variables
declare module 'hono' {
  interface ContextVariableMap {
    userId: string       // membros.id (internal DB id)
    authUid: string      // Supabase auth.users.id
    isAdmin: boolean
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Look up the membros row to get internal id + is_admin
  const { data: membro, error: membroError } = await supabase
    .from('membros')
    .select('id, is_admin')
    .eq('auth_user_id', user.id)
    .single()

  if (membroError || !membro) {
    return c.json({ error: 'Usuário não cadastrado' }, 403)
  }

  c.set('userId', membro.id)
  c.set('authUid', user.id)
  c.set('isAdmin', membro.is_admin)

  await next()
}

export function requireAdmin(c: Context, next: Next) {
  if (!c.get('isAdmin')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  return next()
}
