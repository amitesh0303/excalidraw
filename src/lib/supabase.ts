import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let _supabase: SupabaseClient<Database> | null = null

/**
 * Get the Supabase client instance (lazy initialization).
 * Only throws when the client is actually used, not on module import.
 * This prevents the app from crashing during tests or SSR when env vars are not set.
 */
function getSupabaseClient(): SupabaseClient<Database> {
    if (_supabase) return _supabase

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). ' +
            'Please check your .env.local file.'
        )
    }

    _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        }
    })

    return _supabase
}

/**
 * Supabase client - lazily initialized on first access.
 * Throws if environment variables are missing only when actually used.
 */
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
    get(_target, prop: string | symbol) {
        const client = getSupabaseClient()
        const value = client[prop as keyof typeof client]
        if (typeof value === 'function') {
            return (value as Function).bind(client)
        }
        return value
    }
})
