export interface Database {
    public: {
        Tables: {
            folders: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    parent_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name?: string
                    parent_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    parent_id?: string | null
                    created_at?: string
                }
            }
            scenes: {
                Row: {
                    id: string
                    user_id: string
                    folder_id: string | null
                    name: string
                    elements: string
                    app_state: string
                    thumbnail: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    folder_id?: string | null
                    name?: string
                    elements?: string
                    app_state?: string
                    thumbnail?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    folder_id?: string | null
                    name?: string
                    elements?: string
                    app_state?: string
                    thumbnail?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
        }
    }
}

export interface Folder {
    id: string
    user_id: string
    name: string
    parent_id: string | null
    created_at: string
}

export interface Scene {
    id: string
    user_id: string
    folder_id: string | null
    name: string
    elements: CanvasElement[]
    app_state: AppState
    thumbnail: string | null
    created_at: string
    updated_at: string
}

export interface CanvasElement {
    id: string
    type: 'rectangle' | 'ellipse' | 'diamond' | 'line' | 'arrow' | 'freedraw' | 'text' | 'image' | 'frame' | 'webembed'
    x: number
    y: number
    width: number
    height: number
    strokeColor: string
    fillColor: string
    strokeWidth: number
    opacity: number
    roughness: number
    strokeStyle?: 'solid' | 'dashed' | 'dotted' // Stroke line style
    fillStyle?: 'solid' | 'hachure' | 'cross-hatch' | 'zigzag' // Rough.js fill style
    roundness?: number // 0 = sharp, 1 = round corners
    rotation?: number // Rotation angle in radians
    points?: number[][] // For freedraw and line/arrow
    text?: string // For text elements
    fontSize?: number
    seed: number // For rough.js consistency
    containerId?: string // For text bound to a container shape
    groupId?: string // For grouping elements
    locked?: boolean // Prevent editing
    link?: string // URL link on element
    imageData?: string // Base64 image data for image elements
    frameName?: string // Frame title/name
    embedUrl?: string // URL for embedded content
}

export interface AppState {
    zoom: number
    scrollX: number
    scrollY: number
    selectedElementIds: string[]
}
