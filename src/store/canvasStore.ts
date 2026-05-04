import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { CanvasElement, AppState } from '../types/database'

export type Tool = 'select' | 'hand' | 'rectangle' | 'ellipse' | 'diamond' | 'line' | 'arrow' | 'freedraw' | 'text' | 'eraser' | 'image' | 'frame' | 'webembed' | 'laser'

// Maximum history states to prevent memory leaks
const MAX_HISTORY = 50

interface CanvasState {
    // Elements
    elements: CanvasElement[]
    selectedElementIds: string[]

    // Tool state
    currentTool: Tool
    strokeColor: string
    fillColor: string
    strokeWidth: number
    opacity: number
    roughness: number
    strokeStyle: 'solid' | 'dashed' | 'dotted'
    fillStyle: 'solid' | 'hachure' | 'cross-hatch' | 'zigzag'
    roundness: number

    // Clipboard
    clipboard: CanvasElement[]

    // Style clipboard (for copy/paste style)
    styleClipboard: Partial<CanvasElement> | null

    // Viewport
    zoom: number
    scrollX: number
    scrollY: number

    // History
    history: CanvasElement[][]
    historyIndex: number

    // Actions
    setTool: (tool: Tool) => void
    setStrokeColor: (color: string) => void
    setFillColor: (color: string) => void
    setStrokeWidth: (width: number) => void
    setOpacity: (opacity: number) => void
    setRoughness: (roughness: number) => void
    setStrokeStyle: (style: 'solid' | 'dashed' | 'dotted') => void
    setFillStyle: (style: 'solid' | 'hachure' | 'cross-hatch' | 'zigzag') => void
    setRoundness: (roundness: number) => void

    addElement: (element: Omit<CanvasElement, 'id' | 'seed'>) => CanvasElement
    updateElement: (id: string, updates: Partial<CanvasElement>) => void
    deleteElements: (ids: string[]) => void

    selectElements: (ids: string[]) => void
    toggleSelectElement: (id: string) => void
    clearSelection: () => void

    // Clipboard operations
    copySelected: () => void
    cutSelected: () => void
    pasteClipboard: () => void
    duplicateSelected: () => void

    // Style clipboard
    copyStyle: () => void
    pasteStyle: () => void

    // Layer ordering
    bringToFront: (ids: string[]) => void
    sendToBack: (ids: string[]) => void
    bringForward: (ids: string[]) => void
    sendBackward: (ids: string[]) => void

    // Grouping
    groupSelected: () => void
    ungroupSelected: () => void

    // Lock
    toggleLockSelected: () => void

    // Flip
    flipHorizontal: () => void
    flipVertical: () => void

    setZoom: (zoom: number) => void
    setScroll: (x: number, y: number) => void

    undo: () => void
    redo: () => void
    saveToHistory: () => void

    loadScene: (elements: CanvasElement[], appState: AppState) => void
    exportScene: () => { elements: CanvasElement[]; appState: AppState }
    clearCanvas: () => void
}

const DEFAULT_COLORS = {
    stroke: '#ffffff',
    fill: 'transparent',
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
    // Initial state
    elements: [],
    selectedElementIds: [],
    currentTool: 'select',
    strokeColor: DEFAULT_COLORS.stroke,
    fillColor: DEFAULT_COLORS.fill,
    strokeWidth: 2,
    opacity: 1,
    roughness: 1,
    strokeStyle: 'solid',
    fillStyle: 'solid',
    roundness: 0,
    clipboard: [],
    styleClipboard: null,
    zoom: 1,
    scrollX: 0,
    scrollY: 0,
    history: [[]],
    historyIndex: 0,

    // Tool actions
    setTool: (tool) => set({ currentTool: tool }),
    setStrokeColor: (color) => set({ strokeColor: color }),
    setFillColor: (color) => set({ fillColor: color }),
    setStrokeWidth: (width) => set({ strokeWidth: width }),
    setOpacity: (opacity) => set({ opacity: opacity }),
    setRoughness: (roughness) => set({ roughness: roughness }),
    setStrokeStyle: (style) => set({ strokeStyle: style }),
    setFillStyle: (style) => set({ fillStyle: style }),
    setRoundness: (roundness) => set({ roundness: roundness }),

    // Element actions
    addElement: (element) => {
        const newElement: CanvasElement = {
            ...element,
            id: uuidv4(),
            seed: Math.floor(Math.random() * 100000),
        }
        set((state) => ({
            elements: [...state.elements, newElement],
        }))
        return newElement
    },

    updateElement: (id, updates) => {
        set((state) => ({
            elements: state.elements.map((el) =>
                el.id === id ? { ...el, ...updates } : el
            ),
        }))
    },

    deleteElements: (ids) => {
        set((state) => ({
            elements: state.elements.filter((el) => !ids.includes(el.id)),
            selectedElementIds: state.selectedElementIds.filter((id) => !ids.includes(id)),
        }))
        get().saveToHistory()
    },

    selectElements: (ids) => set({ selectedElementIds: ids }),
    toggleSelectElement: (id) => set((state) => {
        if (state.selectedElementIds.includes(id)) {
            return { selectedElementIds: state.selectedElementIds.filter(sid => sid !== id) }
        }
        return { selectedElementIds: [...state.selectedElementIds, id] }
    }),
    clearSelection: () => set({ selectedElementIds: [] }),

    // Clipboard operations
    copySelected: () => {
        const state = get()
        const selected = state.elements.filter(el => state.selectedElementIds.includes(el.id))
        set({ clipboard: JSON.parse(JSON.stringify(selected)) })
    },

    cutSelected: () => {
        const state = get()
        const selected = state.elements.filter(el => state.selectedElementIds.includes(el.id))
        set({ clipboard: JSON.parse(JSON.stringify(selected)) })
        get().deleteElements(state.selectedElementIds)
    },

    pasteClipboard: () => {
        const state = get()
        if (state.clipboard.length === 0) return
        const offset = 20
        const newElements = state.clipboard.map(el => ({
            ...el,
            id: uuidv4(),
            seed: Math.floor(Math.random() * 100000),
            x: el.x + offset,
            y: el.y + offset,
        }))
        const newIds = newElements.map(el => el.id)
        set((state) => ({
            elements: [...state.elements, ...newElements],
            selectedElementIds: newIds,
        }))
        get().saveToHistory()
    },

    duplicateSelected: () => {
        const state = get()
        const selected = state.elements.filter(el => state.selectedElementIds.includes(el.id))
        if (selected.length === 0) return
        const offset = 20
        const newElements = selected.map(el => ({
            ...el,
            id: uuidv4(),
            seed: Math.floor(Math.random() * 100000),
            x: el.x + offset,
            y: el.y + offset,
        }))
        const newIds = newElements.map(el => el.id)
        set((state) => ({
            elements: [...state.elements, ...newElements],
            selectedElementIds: newIds,
        }))
        get().saveToHistory()
    },

    // Style clipboard
    copyStyle: () => {
        const state = get()
        if (state.selectedElementIds.length === 0) return
        const el = state.elements.find(e => e.id === state.selectedElementIds[0])
        if (!el) return
        set({
            styleClipboard: {
                strokeColor: el.strokeColor,
                fillColor: el.fillColor,
                strokeWidth: el.strokeWidth,
                opacity: el.opacity,
                roughness: el.roughness,
                strokeStyle: el.strokeStyle,
                fillStyle: el.fillStyle,
                roundness: el.roundness,
            }
        })
    },

    pasteStyle: () => {
        const state = get()
        if (!state.styleClipboard || state.selectedElementIds.length === 0) return
        state.selectedElementIds.forEach(id => {
            get().updateElement(id, state.styleClipboard!)
        })
        get().saveToHistory()
    },

    // Layer ordering
    bringToFront: (ids) => {
        set((state) => {
            const selected = state.elements.filter(el => ids.includes(el.id))
            const rest = state.elements.filter(el => !ids.includes(el.id))
            return { elements: [...rest, ...selected] }
        })
        get().saveToHistory()
    },

    sendToBack: (ids) => {
        set((state) => {
            const selected = state.elements.filter(el => ids.includes(el.id))
            const rest = state.elements.filter(el => !ids.includes(el.id))
            return { elements: [...selected, ...rest] }
        })
        get().saveToHistory()
    },

    bringForward: (ids) => {
        set((state) => {
            const elems = [...state.elements]
            for (let i = elems.length - 2; i >= 0; i--) {
                if (ids.includes(elems[i].id) && !ids.includes(elems[i + 1].id)) {
                    [elems[i], elems[i + 1]] = [elems[i + 1], elems[i]]
                }
            }
            return { elements: elems }
        })
        get().saveToHistory()
    },

    sendBackward: (ids) => {
        set((state) => {
            const elems = [...state.elements]
            for (let i = 1; i < elems.length; i++) {
                if (ids.includes(elems[i].id) && !ids.includes(elems[i - 1].id)) {
                    [elems[i - 1], elems[i]] = [elems[i], elems[i - 1]]
                }
            }
            return { elements: elems }
        })
        get().saveToHistory()
    },

    // Grouping
    groupSelected: () => {
        const state = get()
        if (state.selectedElementIds.length < 2) return
        const groupId = uuidv4()
        state.selectedElementIds.forEach(id => {
            get().updateElement(id, { groupId })
        })
        get().saveToHistory()
    },

    ungroupSelected: () => {
        const state = get()
        state.selectedElementIds.forEach(id => {
            get().updateElement(id, { groupId: undefined })
        })
        get().saveToHistory()
    },

    // Lock
    toggleLockSelected: () => {
        const state = get()
        const firstEl = state.elements.find(e => e.id === state.selectedElementIds[0])
        const newLocked = !firstEl?.locked
        state.selectedElementIds.forEach(id => {
            get().updateElement(id, { locked: newLocked })
        })
        get().saveToHistory()
    },

    // Flip
    flipHorizontal: () => {
        const state = get()
        state.selectedElementIds.forEach(id => {
            const el = state.elements.find(e => e.id === id)
            if (!el) return
            if (el.type === 'freedraw' && el.points) {
                const xs = el.points.map(p => p[0])
                const minX = Math.min(...xs)
                const maxX = Math.max(...xs)
                const newPoints = el.points.map(p => [maxX - (p[0] - minX) + minX, p[1]])
                get().updateElement(id, { points: newPoints })
            } else {
                get().updateElement(id, { width: -el.width })
            }
        })
        get().saveToHistory()
    },

    flipVertical: () => {
        const state = get()
        state.selectedElementIds.forEach(id => {
            const el = state.elements.find(e => e.id === id)
            if (!el) return
            if (el.type === 'freedraw' && el.points) {
                const ys = el.points.map(p => p[1])
                const minY = Math.min(...ys)
                const maxY = Math.max(...ys)
                const newPoints = el.points.map(p => [p[0], maxY - (p[1] - minY) + minY])
                get().updateElement(id, { points: newPoints })
            } else {
                get().updateElement(id, { height: -el.height })
            }
        })
        get().saveToHistory()
    },

    // Viewport actions
    setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
    setScroll: (x, y) => set({ scrollX: x, scrollY: y }),

    // History actions
    saveToHistory: () => {
        set((state) => {
            // Remove future history if we're not at the end
            const newHistory = state.history.slice(0, state.historyIndex + 1)
            
            // Add current state (deep clone to prevent mutations)
            newHistory.push(JSON.parse(JSON.stringify(state.elements)))
            
            // Limit history size (FIFO - remove oldest)
            if (newHistory.length > MAX_HISTORY) {
                newHistory.shift()
                return {
                    history: newHistory,
                    historyIndex: newHistory.length - 1,
                }
            }
            
            return {
                history: newHistory,
                historyIndex: newHistory.length - 1,
            }
        })
    },

    undo: () => {
        set((state) => {
            if (state.historyIndex <= 0) return state
            const newIndex = state.historyIndex - 1
            return {
                elements: [...state.history[newIndex]],
                historyIndex: newIndex,
                selectedElementIds: [],
            }
        })
    },

    redo: () => {
        set((state) => {
            if (state.historyIndex >= state.history.length - 1) return state
            const newIndex = state.historyIndex + 1
            return {
                elements: [...state.history[newIndex]],
                historyIndex: newIndex,
                selectedElementIds: [],
            }
        })
    },

    // Scene management
    loadScene: (elements, appState) => {
        set({
            elements,
            zoom: appState.zoom || 1,
            scrollX: appState.scrollX || 0,
            scrollY: appState.scrollY || 0,
            selectedElementIds: [],
            history: [elements],
            historyIndex: 0,
        })
    },

    exportScene: () => {
        const state = get()
        return {
            elements: state.elements,
            appState: {
                zoom: state.zoom,
                scrollX: state.scrollX,
                scrollY: state.scrollY,
                selectedElementIds: [],
            },
        }
    },

    clearCanvas: () => {
        set({
            elements: [],
            selectedElementIds: [],
            history: [[]],
            historyIndex: 0,
        })
    },
}))
