import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Scene } from '../types/database'
import { sceneNameSchema, validateInput } from '../lib/validation'
import { formatErrorMessage } from '../lib/errorHandler'
import { sceneRateLimiter, checkRateLimit } from '../lib/rateLimiter'

// Parse scene from DB format
function parseScene(raw: any): Scene {
    return {
        ...raw,
        elements: typeof raw.elements === 'string' ? JSON.parse(raw.elements) : raw.elements || [],
        app_state: typeof raw.app_state === 'string' ? JSON.parse(raw.app_state) : raw.app_state || {},
    }
}

export function useScenes() {
    const { user } = useAuth()
    const [scenes, setScenes] = useState<Scene[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch scenes
    const fetchScenes = useCallback(async () => {
        if (!user) return
        setLoading(true)
        setError(null)

        try {
            const { data, error: fetchError } = await supabase
                .from('scenes')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })

            if (fetchError) throw fetchError
            setScenes((data || []).map(parseScene))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch scenes')
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        fetchScenes()
    }, [fetchScenes])

    // Create scene
    const createScene = async (folderId?: string | null, name?: string): Promise<Scene | null> => {
        if (!user) return null

        try {
            // Check rate limit
            checkRateLimit(sceneRateLimiter, user.id)

            // Validate scene name
            const validatedName = validateInput(sceneNameSchema, name || 'Untitled')

            const newScene: Scene = {
                id: uuidv4(),
                user_id: user.id,
                folder_id: folderId || null,
                name: validatedName,
                elements: [],
                app_state: { zoom: 1, scrollX: 0, scrollY: 0, selectedElementIds: [] },
                thumbnail: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }

            const { data, error: insertError } = await supabase
                .from('scenes')
                .insert({
                    id: newScene.id,
                    user_id: newScene.user_id,
                    folder_id: newScene.folder_id,
                    name: newScene.name,
                    elements: JSON.stringify(newScene.elements),
                    app_state: JSON.stringify(newScene.app_state),
                } as never)
                .select()
                .single()

            if (insertError) throw insertError
            const parsed = parseScene(data)
            setScenes((prev) => [parsed, ...prev])
            return parsed
        } catch (err) {
            const errorMsg = formatErrorMessage(err)
            setError(errorMsg)
            return null
        }
    }

    // Update scene
    const updateScene = async (id: string, updates: Partial<Pick<Scene, 'name' | 'elements' | 'app_state' | 'folder_id' | 'thumbnail'>>) => {
        try {
            // Validate scene name if provided
            if (updates.name !== undefined) {
                updates.name = validateInput(sceneNameSchema, updates.name)
            }
            const updatedAt = new Date().toISOString()

            const dbUpdates: any = { updated_at: updatedAt }
            if (updates.name !== undefined) dbUpdates.name = updates.name
            if (updates.folder_id !== undefined) dbUpdates.folder_id = updates.folder_id
            if (updates.thumbnail !== undefined) dbUpdates.thumbnail = updates.thumbnail
            if (updates.elements !== undefined) dbUpdates.elements = JSON.stringify(updates.elements)
            if (updates.app_state !== undefined) dbUpdates.app_state = JSON.stringify(updates.app_state)

            const { error: updateError } = await supabase
                .from('scenes')
                .update(dbUpdates as never)
                .eq('id', id)

            if (updateError) throw updateError
            setScenes((prev) =>
                prev.map((s) => (s.id === id ? { ...s, ...updates, updated_at: updatedAt } : s))
            )
        } catch (err) {
            const errorMsg = formatErrorMessage(err)
            setError(errorMsg)
        }
    }

    // Delete scene
    const deleteScene = async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('scenes')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError
            setScenes((prev) => prev.filter((s) => s.id !== id))
        } catch (err) {
            const errorMsg = formatErrorMessage(err)
            setError(errorMsg)
        }
    }

    // Get single scene
    const getScene = async (id: string): Promise<Scene | null> => {
        try {
            const { data, error: fetchError } = await supabase
                .from('scenes')
                .select('*')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError
            return parseScene(data)
        } catch (err) {
            const errorMsg = formatErrorMessage(err)
            setError(errorMsg)
            return null
        }
    }

    return {
        scenes,
        loading,
        error,
        createScene,
        updateScene,
        deleteScene,
        getScene,
        refetch: fetchScenes,
    }
}
