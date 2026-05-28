import { useEffect } from 'react'
import { useCanvasStore, Tool } from '../store/canvasStore'

interface KeyboardShortcutDeps {
    setTool: (tool: Tool) => void
    undo: () => void
    redo: () => void
    copySelected: () => void
    cutSelected: () => void
    pasteClipboard: () => void
    duplicateSelected: () => void
    bringToFront: (ids: string[]) => void
    sendToBack: (ids: string[]) => void
    bringForward: (ids: string[]) => void
    sendBackward: (ids: string[]) => void
    groupSelected: () => void
    ungroupSelected: () => void
    deleteElements: (ids: string[]) => void
    clearSelection: () => void
    saveToHistory: () => void
    setZoom: (zoom: number) => void
    setScroll: (x: number, y: number) => void
    setSpacePressed: (pressed: boolean) => void
    setFindDialog: (open: boolean) => void
    setCommandPalette: (open: boolean) => void
    setLinkDialog: (dialog: { x: number; y: number; url: string; elementId: string } | null) => void
    setShowMenu: (show: boolean) => void
    setContextMenu: (menu: null) => void
    lassoMode: boolean
    setLassoMode: (mode: boolean) => void
    setLassoPoints: (points: number[][]) => void
}

export function useKeyboardShortcuts(deps: KeyboardShortcutDeps): void {
    const {
        setTool, undo, redo,
        copySelected, cutSelected, pasteClipboard, duplicateSelected,
        bringToFront, sendToBack, bringForward, sendBackward,
        groupSelected, ungroupSelected,
        deleteElements, clearSelection, saveToHistory,
        setZoom, setScroll, setSpacePressed,
        setFindDialog, setCommandPalette, setLinkDialog,
        setShowMenu, setContextMenu,
        lassoMode, setLassoMode, setLassoPoints,
    } = deps

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            // Space for pan
            if (e.code === 'Space' && !e.repeat) {
                setSpacePressed(true)
                e.preventDefault()
            }

            // Single-key tool shortcuts (only when no modifier keys are held)
            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                const toolShortcuts: Record<string, Tool> = {
                    v: 'select',
                    h: 'hand',
                    r: 'rectangle',
                    o: 'ellipse',
                    d: 'diamond',
                    l: 'line',
                    a: 'arrow',
                    p: 'freedraw',
                    t: 'text',
                    e: 'eraser',
                    f: 'frame',
                    w: 'webembed',
                    '.': 'laser',
                }
                const tool = toolShortcuts[e.key.toLowerCase()]
                if (tool) {
                    e.preventDefault()
                    setTool(tool)
                    return
                }

                // Number key shortcuts for tools (1-9)
                const numberShortcuts: Record<string, Tool> = {
                    '1': 'select',
                    '2': 'rectangle',
                    '3': 'ellipse',
                    '4': 'diamond',
                    '5': 'line',
                    '6': 'arrow',
                    '7': 'freedraw',
                    '8': 'text',
                    '9': 'eraser',
                }
                const numTool = numberShortcuts[e.key]
                if (numTool) {
                    e.preventDefault()
                    setTool(numTool)
                    return
                }
            }

            // Ctrl/Cmd shortcuts
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault()
                    if (e.shiftKey) redo()
                    else undo()
                    return
                }
                if (e.key === 'y') {
                    e.preventDefault()
                    redo()
                    return
                }
                if (e.key === 'c' && !e.shiftKey) {
                    e.preventDefault()
                    copySelected()
                    return
                }
                if (e.key === 'x') {
                    e.preventDefault()
                    cutSelected()
                    return
                }
                if (e.key === 'v' && !e.shiftKey) {
                    e.preventDefault()
                    pasteClipboard()
                    return
                }
                if (e.key === 'd') {
                    e.preventDefault()
                    duplicateSelected()
                    return
                }
                if (e.key === ']') {
                    e.preventDefault()
                    const state = useCanvasStore.getState()
                    if (e.shiftKey) bringToFront(state.selectedElementIds)
                    else bringForward(state.selectedElementIds)
                    return
                }
                if (e.key === '[') {
                    e.preventDefault()
                    const state = useCanvasStore.getState()
                    if (e.shiftKey) sendToBack(state.selectedElementIds)
                    else sendBackward(state.selectedElementIds)
                    return
                }
                if (e.key === 'g') {
                    e.preventDefault()
                    if (e.shiftKey) ungroupSelected()
                    else groupSelected()
                    return
                }
                if (e.key === '0') {
                    e.preventDefault()
                    setZoom(1)
                    setScroll(0, 0)
                    return
                }
                if (e.key === 'f') {
                    e.preventDefault()
                    setFindDialog(true)
                    return
                }
                if (e.key === '/' || (e.shiftKey && e.key === 'p')) {
                    e.preventDefault()
                    setCommandPalette(true)
                    return
                }
                if (e.key === 'l' && !e.shiftKey) {
                    e.preventDefault()
                    const state = useCanvasStore.getState()
                    if (state.selectedElementIds.length > 0) {
                        const element = state.elements.find(el => el.id === state.selectedElementIds[0])
                        if (element) {
                            setLinkDialog({ x: 0, y: 0, url: element.link || '', elementId: element.id })
                        }
                    }
                    return
                }
                if (e.shiftKey && e.key === 'l') {
                    e.preventDefault()
                    setLassoMode(!lassoMode)
                    if (lassoMode) setLassoPoints([])
                    return
                }
            }

            // Delete
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const state = useCanvasStore.getState()
                if (state.selectedElementIds.length > 0) {
                    e.preventDefault()
                    const idsToDelete = [...state.selectedElementIds]
                    state.selectedElementIds.forEach(id => {
                        const boundTexts = state.elements.filter(el => el.containerId === id)
                        boundTexts.forEach(textEl => idsToDelete.push(textEl.id))
                    })
                    deleteElements(idsToDelete)
                    saveToHistory()
                }
            }

            // Escape
            if (e.key === 'Escape') {
                clearSelection()
                setTool('select')
                setShowMenu(false)
                setContextMenu(null)
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setSpacePressed(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [lassoMode, setTool, undo, redo, copySelected, cutSelected, pasteClipboard,
        duplicateSelected, bringToFront, sendToBack, bringForward, sendBackward,
        groupSelected, ungroupSelected, deleteElements, clearSelection, saveToHistory,
        setZoom, setScroll, setSpacePressed, setFindDialog, setCommandPalette,
        setLinkDialog, setShowMenu, setContextMenu, setLassoMode, setLassoPoints])
}
