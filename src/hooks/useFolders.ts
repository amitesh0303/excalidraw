import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Folder } from '../types/database'
import { folderNameSchema, validateInput } from '../lib/validation'
import { checkRateLimit, folderRateLimiter } from '../lib/rateLimiter'
import { withErrorHandling } from '../lib/supabaseHelpers'

export function useFolders() {
    const { user } = useAuth()
    const [folders, setFolders] = useState<Folder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch folders
    const fetchFolders = useCallback(async () => {
        if (!user) return
        setLoading(true)
        setError(null)

        try {
            const { data, error: fetchError } = await supabase
                .from('folders')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })

            if (fetchError) throw fetchError
            setFolders((data || []) as Folder[])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch folders')
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        fetchFolders()
    }, [fetchFolders])

    // Create folder
    const createFolder = async (name: string = 'New Folder', parentId?: string | null): Promise<Folder | null> => {
        if (!user) return null

        return withErrorHandling(async () => {
            // Check rate limit
            checkRateLimit(folderRateLimiter, user.id)

            // Validate folder name
            const validatedName = validateInput(folderNameSchema, name)

            const newFolder: Folder = {
                id: uuidv4(),
                user_id: user.id,
                name: validatedName,
                parent_id: parentId || null,
                created_at: new Date().toISOString(),
            }

            const { data, error: insertError } = await supabase
                .from('folders')
                .insert(newFolder as never)
                .select()
                .single()

            if (insertError) throw insertError
            setFolders((prev) => [...prev, data as Folder])
            return data as Folder
        }, setError)
    }

    // Rename folder
    const renameFolder = async (id: string, name: string) => {
        await withErrorHandling(async () => {
            // Validate folder name
            const validatedName = validateInput(folderNameSchema, name)

            const { error: updateError } = await supabase
                .from('folders')
                .update({ name: validatedName } as never)
                .eq('id', id)

            if (updateError) throw updateError
            setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: validatedName } : f)))
        }, setError)
    }

    // Delete folder
    const deleteFolder = async (id: string) => {
        await withErrorHandling(async () => {
            const { error: deleteError } = await supabase
                .from('folders')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError
            setFolders((prev) => prev.filter((f) => f.id !== id && f.parent_id !== id))
        }, setError)
    }

    return {
        folders,
        loading,
        error,
        createFolder,
        renameFolder,
        deleteFolder,
        refetch: fetchFolders,
    }
}
