import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import rough from 'roughjs'
import { useCanvasStore, Tool } from '../store/canvasStore'
import { useScenes } from '../hooks/useScenes'
import { useAutoSave } from '../hooks/useAutoSave'
import { getVisibleElements, getElementsInSelection } from '../lib/canvasUtils'
import type { CanvasElement } from '../types/database'

// SVG Tool Icons (Excalidraw-style)
const ToolIcons: Record<Tool, React.ReactNode> = {
    select: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
        </svg>
    ),
    hand: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
    ),
    rectangle: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
    ),
    ellipse: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="12" rx="9" ry="9" />
        </svg>
    ),
    diamond: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l10 10-10 10L2 12z" />
        </svg>
    ),
    line: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="19" x2="19" y2="5" />
        </svg>
    ),
    arrow: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="19" x2="19" y2="5" />
            <polyline points="10,5 19,5 19,14" />
        </svg>
    ),
    freedraw: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
        </svg>
    ),
    text: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4,7 4,4 20,4 20,7" />
            <line x1="12" y1="4" x2="12" y2="20" />
            <line x1="8" y1="20" x2="16" y2="20" />
        </svg>
    ),
    eraser: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L13.2 3c.8-.8 2-.8 2.8 0L21 8c.8.8.8 2 0 2.8L12 20" />
            <path d="M6 11l8 8" />
        </svg>
    ),
    image: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21,15 16,10 5,21" />
        </svg>
    ),
    frame: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
            <path d="M7 4v16" />
            <path d="M17 4v16" />
        </svg>
    ),
    webembed: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    ),
    laser: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="20" x2="20" y2="4" />
            <circle cx="5" cy="19" r="1" fill="currentColor" />
            <circle cx="19" cy="5" r="1" fill="currentColor" />
        </svg>
    ),
}

// Tool definitions
const TOOLS: { id: Tool; label: string; shortcut: string }[] = [
    { id: 'select', label: 'Selection', shortcut: 'Ctrl+1' },
    { id: 'hand', label: 'Hand (Pan)', shortcut: 'Ctrl+H' },
    { id: 'rectangle', label: 'Rectangle', shortcut: 'Ctrl+R' },
    { id: 'ellipse', label: 'Ellipse', shortcut: 'Ctrl+O' },
    { id: 'diamond', label: 'Diamond', shortcut: 'Ctrl+D' },
    { id: 'line', label: 'Line', shortcut: 'Ctrl+L' },
    { id: 'arrow', label: 'Arrow', shortcut: 'Ctrl+A' },
    { id: 'freedraw', label: 'Pencil', shortcut: 'Ctrl+P' },
    { id: 'text', label: 'Text', shortcut: 'Ctrl+T' },
    { id: 'eraser', label: 'Eraser', shortcut: 'Ctrl+E' },
    { id: 'frame', label: 'Frame', shortcut: 'Ctrl+F' },
    { id: 'webembed', label: 'Web Embed', shortcut: 'Ctrl+W' },
    { id: 'laser', label: 'Laser Pointer', shortcut: 'Ctrl+.' },
]

// Extended color palette
const STROKE_COLORS = [
    '#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00',
    '#9c36b5', '#0c8599', '#f783ac', '#495057', '#ffffff',
]

const FILL_COLORS = [
    'transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99',
    '#eebefa', '#99e9f2', '#fcc2d7', '#e9ecef', '#1e1e1e',
]

const BG_COLORS = [
    '#ffffff', '#f8f9fa', '#fff5f5', '#ebfbee', '#e7f5ff',
    '#fff9db', '#f8f0fc', '#e3fafc', '#121212', '#1a1a2e',
]

export default function Editor() {
    const { sceneId } = useParams()
    const navigate = useNavigate()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const textInputRef = useRef<HTMLTextAreaElement>(null)

    // Scene management
    const { getScene, updateScene, deleteScene } = useScenes()
    const [sceneName, setSceneName] = useState('Untitled')
    const [isEditingName, setIsEditingName] = useState(false)
    const [canvasBg, setCanvasBg] = useState('#121212')
    const [showMenu, setShowMenu] = useState(false)
    const [spacePressed, setSpacePressed] = useState(false)
    const [darkMode, setDarkMode] = useState(true)

    // Canvas store
    const {
        elements, currentTool, strokeColor, fillColor, strokeWidth, opacity, roughness, strokeStyle, fillStyle, roundness,
        zoom, scrollX, scrollY, selectedElementIds,
        setTool, setStrokeColor, setFillColor, setStrokeWidth, setOpacity, setRoughness, setStrokeStyle, setFillStyle, setRoundness,
        addElement, updateElement, deleteElements, selectElements, toggleSelectElement, clearSelection,
        copySelected, cutSelected, pasteClipboard, duplicateSelected,
        copyStyle, pasteStyle,
        bringToFront, sendToBack, bringForward, sendBackward,
        groupSelected, ungroupSelected,
        flipHorizontal, flipVertical,
        toggleLockSelected,
        setZoom, setScroll, saveToHistory, loadScene, exportScene, undo, redo, clearCanvas,
    } = useCanvasStore()

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false)
    const [isPanning, setIsPanning] = useState(false)
    const [isErasing, setIsErasing] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [resizeHandle, setResizeHandle] = useState<string | null>(null)
    const [resizeStart, setResizeStart] = useState<{ x: number; y: number; el: CanvasElement } | null>(null)
    const [isRotating, setIsRotating] = useState(false)
    const [rotateStart, setRotateStart] = useState<{ angle: number; elRotation: number } | null>(null)
    const [startPos, setStartPos] = useState({ x: 0, y: 0 })
    const [panStart, setPanStart] = useState({ x: 0, y: 0 })
    const [currentElement, setCurrentElement] = useState<CanvasElement | null>(null)

    // Box selection state
    const [isBoxSelecting, setIsBoxSelecting] = useState(false)
    const [boxSelectStart, setBoxSelectStart] = useState({ x: 0, y: 0 })
    const [boxSelectEnd, setBoxSelectEnd] = useState({ x: 0, y: 0 })

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

    // Text input state - stores SCREEN coordinates for positioning the input
    const [textInput, setTextInput] = useState<{ x: number; y: number; canvasX: number; canvasY: number; visible: boolean }>({ x: 0, y: 0, canvasX: 0, canvasY: 0, visible: false })
    const [textValue, setTextValue] = useState('')

    // Keep selected tool after drawing (like Excalidraw's lock mode)
    const [keepSelectedTool, setKeepSelectedTool] = useState(false)

    // Track when text input was created to prevent immediate blur
    const textInputCreatedAt = useRef<number>(0)

    // Track if text was just saved by handleMouseDown to prevent duplicate save in onBlur
    const textJustSaved = useRef<boolean>(false)

    // Dialog states
    const [linkDialog, setLinkDialog] = useState<{ x: number; y: number; url: string; elementId: string } | null>(null)
    const [findDialog, setFindDialog] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [commandPalette, setCommandPalette] = useState(false)
    const [libraryDialog, setLibraryDialog] = useState(false)
    const [library, setLibrary] = useState<CanvasElement[]>([])
    const [lassoMode, setLassoMode] = useState(false)
    const [lassoPoints, setLassoPoints] = useState<number[][]>([])
    const [frameDialog, setFrameDialog] = useState(false)
    const [frameName, setFrameName] = useState('')
    const [webembedDialog, setWebembedDialog] = useState(false)
    const [embedUrl, setEmbedUrl] = useState('')
    const [laserPoints, setLaserPoints] = useState<number[][]>([])

    // Load scene on mount
    useEffect(() => {
        if (sceneId) {
            getScene(sceneId).then((scene) => {
                if (scene) {
                    setSceneName(scene.name)
                    loadScene(scene.elements, scene.app_state)
                }
            })
        }
    }, [sceneId])

    // Optimized auto-save with change detection
    useAutoSave(
        { elements, appState: { zoom, scrollX, scrollY, selectedElementIds } },
        {
            delay: 2000,
            onSave: async () => {
                if (!sceneId) return
                const { elements: els, appState } = exportScene()
                await updateScene(sceneId, { elements: els, app_state: appState })
            },
            onError: (error) => {
                console.error('Auto-save failed:', error)
                // Could show a toast notification here
            }
        }
    )

    // Calculate visible elements for performance (viewport culling)
    const visibleElements = useMemo(() => {
        const canvas = canvasRef.current
        if (!canvas) return elements

        return getVisibleElements(elements, {
            x: -scrollX / zoom,
            y: -scrollY / zoom,
            width: canvas.width / zoom,
            height: canvas.height / zoom,
            zoom
        })
    }, [elements, scrollX, scrollY, zoom])

    // Handler functions
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const imageData = event.target?.result as string
            addElement({
                type: 'image',
                x: 100,
                y: 100,
                width: 200,
                height: 200,
                strokeColor: '#000000',
                fillColor: 'transparent',
                strokeWidth: 2,
                opacity: 1,
                roughness: 0,
                imageData,
            })
            saveToHistory()
        }
        reader.readAsDataURL(file)
    }

    const handleSaveLink = (link: string) => {
        if (linkDialog) {
            updateElement(linkDialog.elementId, { link })
            saveToHistory()
            setLinkDialog(null)
        }
    }

    const findElements = useCallback(() => {
        if (!searchText.trim()) return []
        return elements.filter(el =>
            el.type === 'text' && el.text?.toLowerCase().includes(searchText.toLowerCase())
        )
    }, [elements, searchText])

    const getElementBounds = (element: CanvasElement) => ({
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
    })

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            // Space for pan
            if (e.code === 'Space' && !e.repeat) {
                setSpacePressed(true)
                e.preventDefault()
            }

            // Tool shortcuts (Ctrl + key to avoid conflicts while typing)
            if (e.ctrlKey || e.metaKey) {
                const shortcuts: Record<string, Tool> = {
                    v: 'select', '1': 'select',
                    r: 'rectangle', '2': 'rectangle',
                    o: 'ellipse', '3': 'ellipse',
                    d: 'diamond', '4': 'diamond',
                    l: 'line', '5': 'line',
                    a: 'arrow', '6': 'arrow',
                    p: 'freedraw', '7': 'freedraw',
                    t: 'text', '8': 'text',
                    e: 'eraser', '9': 'eraser',
                    w: 'webembed',
                    '.': 'laser',
                }
                const tool = shortcuts[e.key.toLowerCase()]
                if (tool) {
                    e.preventDefault()
                    setTool(tool)
                }
            }

            // Undo/Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault()
                if (e.shiftKey) redo()
                else undo()
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault()
                redo()
            }

            // Copy/Cut/Paste/Duplicate
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
                e.preventDefault()
                copySelected()
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
                e.preventDefault()
                cutSelected()
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
                e.preventDefault()
                pasteClipboard()
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault()
                duplicateSelected()
            }

            // Layer ordering
            if ((e.ctrlKey || e.metaKey) && e.key === ']') {
                e.preventDefault()
                if (e.shiftKey) bringToFront(selectedElementIds)
                else bringForward(selectedElementIds)
            }
            if ((e.ctrlKey || e.metaKey) && e.key === '[') {
                e.preventDefault()
                if (e.shiftKey) sendToBack(selectedElementIds)
                else sendBackward(selectedElementIds)
            }

            // Group/Ungroup
            if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
                e.preventDefault()
                if (e.shiftKey) ungroupSelected()
                else groupSelected()
            }

            // Delete
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0) {
                e.preventDefault()
                // Also delete any text elements bound to the deleted containers
                const idsToDelete = [...selectedElementIds]
                selectedElementIds.forEach(id => {
                    const boundTexts = elements.filter(e => e.containerId === id)
                    boundTexts.forEach(textEl => idsToDelete.push(textEl.id))
                })
                deleteElements(idsToDelete)
                saveToHistory()
            }

            // Escape
            if (e.key === 'Escape') {
                clearSelection()
                setTool('select')
                setShowMenu(false)
                setContextMenu(null)
            }

            // Reset zoom
            if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault()
                setZoom(1)
                setScroll(0, 0)
            }

            // Find on Canvas (Ctrl+F)
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault()
                setFindDialog(true)
            }

            // Command Palette (Ctrl+/)
            if ((e.ctrlKey || e.metaKey) && (e.key === '/' || (e.shiftKey && e.key === 'p'))) {
                e.preventDefault()
                setCommandPalette(true)
            }

            // Add Link (Ctrl+L)
            if ((e.ctrlKey || e.metaKey) && e.key === 'l' && selectedElementIds.length > 0 && !e.shiftKey) {
                e.preventDefault()
                const element = elements.find(el => el.id === selectedElementIds[0])
                if (element) {
                    setLinkDialog({ x: 0, y: 0, url: element.link || '', elementId: element.id })
                }
            }

            // Lasso Selection (Shift+L but not same as group)
            if (e.shiftKey && e.key === 'l' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                setLassoMode(!lassoMode)
                if (lassoMode) setLassoPoints([])
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
    }, [selectedElementIds])

    // Draw canvas
    const draw = useCallback(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Resize canvas for high DPI
        const dpr = window.devicePixelRatio || 1
        const rect = container.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`
        ctx.scale(dpr, dpr)

        // Clear and set background
        ctx.fillStyle = canvasBg
        ctx.fillRect(0, 0, rect.width, rect.height)

        // Draw dot grid
        ctx.save()
        ctx.translate(scrollX, scrollY)
        ctx.scale(zoom, zoom)

        const gridSize = 20
        const dotSize = 1.5
        const dotColor = canvasBg === '#121212' || canvasBg === '#1a1a2e'
            ? 'rgba(255, 255, 255, 0.15)'
            : 'rgba(0, 0, 0, 0.1)'
        ctx.fillStyle = dotColor

        const startX = Math.floor(-scrollX / zoom / gridSize) * gridSize - gridSize
        const startY = Math.floor(-scrollY / zoom / gridSize) * gridSize - gridSize
        const endX = startX + rect.width / zoom + gridSize * 3
        const endY = startY + rect.height / zoom + gridSize * 3

        for (let x = startX; x < endX; x += gridSize) {
            for (let y = startY; y < endY; y += gridSize) {
                ctx.beginPath()
                ctx.arc(x, y, dotSize / zoom, 0, Math.PI * 2)
                ctx.fill()
            }
        }

        // Draw elements (using visibleElements for performance)
        const rc = rough.canvas(canvas)

        const drawElement = (element: CanvasElement) => {
            const roughFillMap: Record<string, string> = {
                'solid': 'solid',
                'hachure': 'hachure',
                'cross-hatch': 'cross-hatch',
                'zigzag': 'zigzag-line',
            }
            const options: any = {
                stroke: element.strokeColor,
                fill: element.fillColor === 'transparent' ? undefined : element.fillColor,
                fillStyle: roughFillMap[element.fillStyle || 'solid'] || 'solid',
                strokeWidth: element.strokeWidth,
                roughness: element.roughness || 1,
                seed: element.seed,
            }

            // Apply stroke style (dashed/dotted)
            if (element.strokeStyle === 'dashed') {
                options.strokeLineDash = [12, 8]
            } else if (element.strokeStyle === 'dotted') {
                options.strokeLineDash = [2, 6]
            }

            ctx.save()
            ctx.globalAlpha = element.opacity

            // Apply rotation if set
            if (element.rotation) {
                const cx = element.x + element.width / 2
                const cy = element.y + element.height / 2
                ctx.translate(cx, cy)
                ctx.rotate(element.rotation)
                ctx.translate(-cx, -cy)
            }

            switch (element.type) {
                case 'rectangle':
                    if (element.roundness && element.roundness > 0) {
                        // Draw rounded rectangle manually since rough.js doesn't support borderRadius
                        const r = Math.min(element.roundness * 15, Math.abs(element.width) / 2, Math.abs(element.height) / 2)
                        ctx.beginPath()
                        ctx.roundRect(element.x, element.y, element.width, element.height, r)
                        ctx.strokeStyle = element.strokeColor
                        ctx.lineWidth = element.strokeWidth
                        if (element.strokeStyle === 'dashed') ctx.setLineDash([12, 8])
                        else if (element.strokeStyle === 'dotted') ctx.setLineDash([2, 6])
                        else ctx.setLineDash([])
                        if (element.fillColor !== 'transparent') {
                            ctx.fillStyle = element.fillColor
                            ctx.fill()
                        }
                        ctx.stroke()
                    } else {
                        rc.rectangle(element.x, element.y, element.width, element.height, options)
                    }
                    break
                case 'ellipse':
                    rc.ellipse(
                        element.x + element.width / 2,
                        element.y + element.height / 2,
                        Math.abs(element.width),
                        Math.abs(element.height),
                        options
                    )
                    break
                case 'diamond': {
                    const cx = element.x + element.width / 2
                    const cy = element.y + element.height / 2
                    rc.polygon([
                        [cx, element.y],
                        [element.x + element.width, cy],
                        [cx, element.y + element.height],
                        [element.x, cy],
                    ], options)
                    break
                }
                case 'line':
                    rc.line(element.x, element.y, element.x + element.width, element.y + element.height, options)
                    break
                case 'arrow': {
                    const endX = element.x + element.width
                    const endY = element.y + element.height
                    rc.line(element.x, element.y, endX, endY, options)
                    // Draw arrowhead
                    const angle = Math.atan2(element.height, element.width)
                    const headLen = Math.min(20, Math.sqrt(element.width ** 2 + element.height ** 2) / 3)
                    rc.line(
                        endX, endY,
                        endX - headLen * Math.cos(angle - Math.PI / 6),
                        endY - headLen * Math.sin(angle - Math.PI / 6),
                        options
                    )
                    rc.line(
                        endX, endY,
                        endX - headLen * Math.cos(angle + Math.PI / 6),
                        endY - headLen * Math.sin(angle + Math.PI / 6),
                        options
                    )
                    break
                }
                case 'freedraw':
                    if (element.points && element.points.length > 1) {
                        // Draw smooth curve through points
                        ctx.beginPath()
                        ctx.strokeStyle = element.strokeColor
                        ctx.lineWidth = element.strokeWidth
                        ctx.lineCap = 'round'
                        ctx.lineJoin = 'round'
                        if (element.strokeStyle === 'dashed') ctx.setLineDash([12, 8])
                        else if (element.strokeStyle === 'dotted') ctx.setLineDash([2, 6])
                        else ctx.setLineDash([])

                        const pts = element.points
                        ctx.moveTo(pts[0][0], pts[0][1])

                        for (let i = 1; i < pts.length - 1; i++) {
                            const xc = (pts[i][0] + pts[i + 1][0]) / 2
                            const yc = (pts[i][1] + pts[i + 1][1]) / 2
                            ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc)
                        }

                        if (pts.length > 1) {
                            ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1])
                        }
                        ctx.stroke()
                        ctx.setLineDash([])
                    }
                    break
                case 'text':
                    ctx.font = `${element.fontSize || 20}px "Segoe UI", system-ui, sans-serif`
                    ctx.fillStyle = element.strokeColor
                    ctx.textBaseline = 'top'
                    const lines = (element.text || '').split('\n')
                    lines.forEach((line, i) => {
                        ctx.fillText(line, element.x, element.y + i * (element.fontSize || 20) * 1.2)
                    })
                    break
                case 'image':
                    if (element.imageData) {
                        const img = new Image()
                        img.onload = () => {
                            ctx.drawImage(img, element.x, element.y, element.width, element.height)
                        }
                        img.src = element.imageData
                    }
                    break
                case 'frame':
                    rc.rectangle(element.x, element.y, element.width, element.height, {
                        stroke: element.strokeColor,
                        strokeWidth: element.strokeWidth,
                        roughness: 0,
                    })
                    // Draw frame name if exists
                    if (element.frameName) {
                        ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif'
                        ctx.fillStyle = element.strokeColor
                        ctx.fillText(element.frameName, element.x + 8, element.y + 8)
                    }
                    break
                case 'webembed':
                    rc.rectangle(element.x, element.y, element.width, element.height, options)
                    // Draw a small embed icon
                    ctx.font = '24px Arial'
                    ctx.fillStyle = element.strokeColor
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillText('🌐', element.x + element.width / 2, element.y + element.height / 2)
                    if (element.embedUrl) {
                        ctx.font = '11px "Segoe UI", system-ui, sans-serif'
                        ctx.fillStyle = '#999'
                        const url = element.embedUrl.substring(0, 30) + (element.embedUrl.length > 30 ? '...' : '')
                        ctx.fillText(url, element.x + element.width / 2, element.y + element.height / 2 + 20)
                    }
                    break
            }

            ctx.restore()

            // Draw selection box + handles
            if (selectedElementIds.includes(element.id)) {
                ctx.save()
                ctx.strokeStyle = '#6965db'
                ctx.lineWidth = 2 / zoom
                ctx.setLineDash([])

                const padding = 8 / zoom
                let bounds = { x: element.x, y: element.y, w: element.width, h: element.height }

                // Handle freedraw bounds
                if (element.type === 'freedraw' && element.points) {
                    const xs = element.points.map(p => p[0])
                    const ys = element.points.map(p => p[1])
                    bounds = {
                        x: Math.min(...xs),
                        y: Math.min(...ys),
                        w: Math.max(...xs) - Math.min(...xs),
                        h: Math.max(...ys) - Math.min(...ys),
                    }
                }

                // Normalize negative dims for selection
                let bx = bounds.x, by = bounds.y, bw = bounds.w, bh = bounds.h
                if (bw < 0) { bx += bw; bw = -bw }
                if (bh < 0) { by += bh; bh = -bh }

                // Apply rotation for selection box
                if (element.rotation) {
                    const cx = element.x + element.width / 2
                    const cy = element.y + element.height / 2
                    ctx.translate(cx, cy)
                    ctx.rotate(element.rotation)
                    ctx.translate(-cx, -cy)
                }

                ctx.strokeRect(
                    bx - padding,
                    by - padding,
                    bw + padding * 2,
                    bh + padding * 2
                )

                // Draw corner handles for resize
                const handleSize = 8 / zoom
                ctx.fillStyle = '#ffffff'
                const corners = [
                    { pos: [bx - padding, by - padding], id: 'nw' },
                    { pos: [bx + bw + padding, by - padding], id: 'ne' },
                    { pos: [bx - padding, by + bh + padding], id: 'sw' },
                    { pos: [bx + bw + padding, by + bh + padding], id: 'se' },
                ]
                corners.forEach(({ pos: [cx, cy] }) => {
                    ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
                    ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
                })

                // Draw edge midpoint handles
                const midHandles = [
                    [bx + bw / 2, by - padding],    // top
                    [bx + bw / 2, by + bh + padding], // bottom
                    [bx - padding, by + bh / 2],     // left
                    [bx + bw + padding, by + bh / 2], // right
                ]
                const midSize = 6 / zoom
                midHandles.forEach(([mx, my]) => {
                    ctx.fillRect(mx - midSize / 2, my - midSize / 2, midSize, midSize)
                    ctx.strokeRect(mx - midSize / 2, my - midSize / 2, midSize, midSize)
                })

                // Draw rotation handle (circle above the element)
                if (element.type !== 'text' && element.type !== 'freedraw') {
                    const rotHandleY = by - padding - 30 / zoom
                    const rotHandleX = bx + bw / 2
                    // Line from top center to rotation handle
                    ctx.beginPath()
                    ctx.moveTo(bx + bw / 2, by - padding)
                    ctx.lineTo(rotHandleX, rotHandleY)
                    ctx.stroke()
                    // Circle
                    ctx.beginPath()
                    ctx.arc(rotHandleX, rotHandleY, 5 / zoom, 0, Math.PI * 2)
                    ctx.fillStyle = '#6965db'
                    ctx.fill()
                    ctx.stroke()
                }

                ctx.restore()
            }
        }

        // Only render visible elements for better performance
        visibleElements.forEach(drawElement)
        if (currentElement) drawElement(currentElement)

        // Draw box selection rectangle
        if (isBoxSelecting) {
            ctx.save()
            ctx.strokeStyle = '#6965db'
            ctx.lineWidth = 1 / zoom
            ctx.setLineDash([6 / zoom, 4 / zoom])
            ctx.fillStyle = 'rgba(105, 101, 219, 0.08)'
            const bx = Math.min(boxSelectStart.x, boxSelectEnd.x)
            const by = Math.min(boxSelectStart.y, boxSelectEnd.y)
            const bw = Math.abs(boxSelectEnd.x - boxSelectStart.x)
            const bh = Math.abs(boxSelectEnd.y - boxSelectStart.y)
            ctx.fillRect(bx, by, bw, bh)
            ctx.strokeRect(bx, by, bw, bh)
            ctx.setLineDash([])
            ctx.restore()
        }

        // Draw laser pointer
        if (laserPoints.length > 0) {
            ctx.save()
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'
            ctx.lineWidth = 3 / zoom
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            ctx.arc(laserPoints[0][0], laserPoints[0][1], 8 / zoom, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }

        // Draw lasso selection
        if (lassoMode && lassoPoints.length > 0) {
            ctx.save()
            ctx.strokeStyle = '#6965db'
            ctx.lineWidth = 1.5 / zoom
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.beginPath()
            ctx.moveTo(lassoPoints[0][0], lassoPoints[0][1])
            for (let i = 1; i < lassoPoints.length; i++) {
                ctx.lineTo(lassoPoints[i][0], lassoPoints[i][1])
            }
            ctx.stroke()
            ctx.restore()
        }

        ctx.restore()
    }, [visibleElements, currentElement, zoom, scrollX, scrollY, selectedElementIds, canvasBg, isBoxSelecting, boxSelectStart, boxSelectEnd, laserPoints, lassoMode, lassoPoints])

    useEffect(() => {
        draw()
    }, [draw])

    // Resize observer
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const observer = new ResizeObserver(() => draw())
        observer.observe(container)
        return () => observer.disconnect()
    }, [draw])

    // Get canvas coordinates
    const getCanvasCoords = (e: React.MouseEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        return {
            x: (e.clientX - rect.left - scrollX) / zoom,
            y: (e.clientY - rect.top - scrollY) / zoom,
        }
    }

    // Find element at point with better hit detection
    const findElementAtPoint = (x: number, y: number): CanvasElement | null => {
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i]
            const padding = 10

            if (el.type === 'freedraw' && el.points && el.points.length > 0) {
                // Check if point is near any segment
                for (let j = 0; j < el.points.length - 1; j++) {
                    const [x1, y1] = el.points[j]
                    const [x2, y2] = el.points[j + 1]
                    const dist = distToSegment(x, y, x1, y1, x2, y2)
                    if (dist < 15) return el
                }
                // Also check first point for single-point drawings
                if (el.points.length === 1) {
                    const [px, py] = el.points[0]
                    if (Math.sqrt((x - px) ** 2 + (y - py) ** 2) < 15) return el
                }
            } else if (el.type === 'line' || el.type === 'arrow') {
                // Better hit detection for lines and arrows
                const dist = distToSegment(x, y, el.x, el.y, el.x + el.width, el.y + el.height)
                if (dist < 15) return el
            } else if (el.type === 'text') {
                // Text elements use bounding box
                const textWidth = (el.text?.length || 0) * 10
                const textHeight = el.fontSize || 20
                if (x >= el.x - padding && x <= el.x + textWidth + padding &&
                    y >= el.y - padding && y <= el.y + textHeight + padding) {
                    return el
                }
            } else {
                // Bounding box check for shapes (rectangle, ellipse, diamond)
                const minX = Math.min(el.x, el.x + el.width) - padding
                const maxX = Math.max(el.x, el.x + el.width) + padding
                const minY = Math.min(el.y, el.y + el.height) - padding
                const maxY = Math.max(el.y, el.y + el.height) + padding
                if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                    return el
                }
            }
        }
        return null
    }

    // Distance from point to line segment
    const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
        const A = px - x1
        const B = py - y1
        const C = x2 - x1
        const D = y2 - y1
        const dot = A * C + B * D
        const lenSq = C * C + D * D
        let t = lenSq !== 0 ? Math.max(0, Math.min(1, dot / lenSq)) : 0
        const nearX = x1 + t * C
        const nearY = y1 + t * D
        return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2)
    }

    // Check if point is inside polygon (for lasso selection)
    const pointInPolygon = (x: number, y: number, polygon: number[][]): boolean => {
        let inside = false
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1]
            const xj = polygon[j][0], yj = polygon[j][1]
            const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
            if (intersect) inside = !inside
        }
        return inside
    }

    // Find a container shape (rectangle, ellipse, diamond) at a point
    const findContainerAtPoint = (x: number, y: number): CanvasElement | null => {
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i]
            // Only closed shapes can be containers
            if (el.type !== 'rectangle' && el.type !== 'ellipse' && el.type !== 'diamond') continue

            const minX = Math.min(el.x, el.x + el.width)
            const maxX = Math.max(el.x, el.x + el.width)
            const minY = Math.min(el.y, el.y + el.height)
            const maxY = Math.max(el.y, el.y + el.height)

            if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                return el
            }
        }
        return null
    }

    // Check if clicking on a resize handle of a selected element
    const findResizeHandle = (x: number, y: number): { handle: string; element: CanvasElement } | null => {
        for (const id of selectedElementIds) {
            const el = elements.find(e => e.id === id)
            if (!el) continue
            const padding = 8 / zoom
            let bx = el.x, by = el.y, bw = el.width, bh = el.height
            if (el.type === 'freedraw' && el.points) continue // no resize for freedraw
            if (bw < 0) { bx += bw; bw = -bw }
            if (bh < 0) { by += bh; bh = -bh }

            const handleSize = 12 / zoom
            const handles: { id: string; cx: number; cy: number }[] = [
                { id: 'nw', cx: bx - padding, cy: by - padding },
                { id: 'ne', cx: bx + bw + padding, cy: by - padding },
                { id: 'sw', cx: bx - padding, cy: by + bh + padding },
                { id: 'se', cx: bx + bw + padding, cy: by + bh + padding },
                { id: 'n', cx: bx + bw / 2, cy: by - padding },
                { id: 's', cx: bx + bw / 2, cy: by + bh + padding },
                { id: 'w', cx: bx - padding, cy: by + bh / 2 },
                { id: 'e', cx: bx + bw + padding, cy: by + bh / 2 },
            ]
            for (const h of handles) {
                if (Math.abs(x - h.cx) < handleSize && Math.abs(y - h.cy) < handleSize) {
                    return { handle: h.id, element: el }
                }
            }

            // Check rotation handle
            if (el.type !== 'text' && el.type !== 'freedraw') {
                const rotX = bx + bw / 2
                const rotY = by - padding - 30 / zoom
                if (Math.sqrt((x - rotX) ** 2 + (y - rotY) ** 2) < 12 / zoom) {
                    return { handle: 'rotate', element: el }
                }
            }
        }
        return null
    }

    // Mouse handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        // Close context menu on any click
        if (contextMenu) setContextMenu(null)

        // Only handle left mouse button clicks
        if (e.button !== 0) return

        const { x, y } = getCanvasCoords(e)

        // Pan with space+click, alt+click, or hand tool
        if (spacePressed || e.altKey || currentTool === 'hand') {
            setIsPanning(true)
            setPanStart({ x: e.clientX - scrollX, y: e.clientY - scrollY })
            return
        }

        // Handle image tool - opens file picker
        if (currentTool === 'image') {
            imageInputRef.current?.click()
            return
        }

        // Handle laser pointer - temporary drawing
        if (currentTool === 'laser') {
            setLaserPoints([[x, y]])
            // Laser pointer will fade out after 2 seconds
            setTimeout(() => setLaserPoints([]), 2000)
            return
        }

        // Handle text tool FIRST before any other checks
        if (currentTool === 'text') {
            const screenX = e.clientX
            const screenY = e.clientY

            // If there's already a visible text input, save its content first
            if (textInput.visible && textValue.trim()) {
                const container = findContainerAtPoint(textInput.canvasX, textInput.canvasY)
                addElement({
                    type: 'text',
                    x: textInput.canvasX,
                    y: textInput.canvasY,
                    width: textValue.length * 10,
                    height: 24,
                    strokeColor, fillColor, strokeWidth, opacity: 1,
                    roughness: 1,
                    text: textValue.trim(),
                    fontSize: 20,
                    containerId: container?.id,
                })
                saveToHistory()
                textJustSaved.current = true
            }

            textInputCreatedAt.current = Date.now()
            setTextInput({ x: screenX, y: screenY, canvasX: x, canvasY: y, visible: true })
            setTextValue('')
            setTimeout(() => textInputRef.current?.focus(), 50)
            return
        }

        if (currentTool === 'select') {
            // Check resize/rotation handles first
            const handleHit = findResizeHandle(x, y)
            if (handleHit) {
                if (handleHit.handle === 'rotate') {
                    setIsRotating(true)
                    const el = handleHit.element
                    const cx = el.x + el.width / 2
                    const cy = el.y + el.height / 2
                    const angle = Math.atan2(y - cy, x - cx)
                    setRotateStart({ angle, elRotation: el.rotation || 0 })
                    setResizeStart({ x, y, el: { ...el } })
                    return
                }
                setIsResizing(true)
                setResizeHandle(handleHit.handle)
                setResizeStart({ x, y, el: { ...handleHit.element } })
                return
            }

            const element = findElementAtPoint(x, y)
            if (element) {
                if (e.shiftKey) {
                    // Multi-select with Shift+Click
                    toggleSelectElement(element.id)
                } else if (!selectedElementIds.includes(element.id)) {
                    selectElements([element.id])
                }
                // Also select grouped elements
                if (element.groupId) {
                    const groupEls = elements.filter(e => e.groupId === element.groupId)
                    const groupIds = groupEls.map(e => e.id)
                    if (e.shiftKey) {
                        selectElements([...new Set([...selectedElementIds, ...groupIds])])
                    } else {
                        selectElements(groupIds)
                    }
                }
                setIsDrawing(true)
                setStartPos({ x: x - element.x, y: y - element.y })
            } else {
                // Start box selection
                if (!e.shiftKey) clearSelection()
                setIsBoxSelecting(true)
                setBoxSelectStart({ x, y })
                setBoxSelectEnd({ x, y })
            }
            return
        }

        if (currentTool === 'eraser') {
            setIsErasing(true)
            const element = findElementAtPoint(x, y)
            if (element) {
                deleteElements([element.id])
            }
            return
        }

        // Handle frame creation
        if (currentTool === 'frame') {
            setFrameDialog(true)
            setFrameName('')
            return
        }

        // Handle webembed creation
        if (currentTool === 'webembed') {
            setWebembedDialog(true)
            setEmbedUrl('')
            return
        }

        // Start drawing shape
        setIsDrawing(true)
        setStartPos({ x, y })

        const newElement: Omit<CanvasElement, 'id' | 'seed'> = {
            type: currentTool as any,
            x, y,
            width: 0,
            height: 0,
            strokeColor, fillColor, strokeWidth, opacity,
            roughness,
            strokeStyle,
            fillStyle,
            roundness,
            points: currentTool === 'freedraw' ? [[x, y]] : undefined,
            frameName: (currentTool as any) === 'frame' ? frameName : undefined,
            embedUrl: (currentTool as any) === 'webembed' ? embedUrl : undefined,
        }

        setCurrentElement({ ...newElement, id: 'temp', seed: Math.floor(Math.random() * 100000) } as CanvasElement)
    }

    // Right-click context menu
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        const { x, y } = getCanvasCoords(e)
        const element = findElementAtPoint(x, y)
        if (element && !selectedElementIds.includes(element.id)) {
            selectElements([element.id])
        }
        setContextMenu({ x: e.clientX, y: e.clientY })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setScroll(e.clientX - panStart.x, e.clientY - panStart.y)
            return
        }

        const { x, y } = getCanvasCoords(e)

        // Eraser swipe - continuously erase while dragging
        if (isErasing) {
            const element = findElementAtPoint(x, y)
            if (element) {
                deleteElements([element.id])
            }
            return
        }

        // Handle resize
        if (isResizing && resizeStart && resizeHandle) {
            const el = resizeStart.el
            const dx = x - resizeStart.x
            const dy = y - resizeStart.y

            let newX = el.x, newY = el.y, newW = el.width, newH = el.height

            if (resizeHandle.includes('e')) { newW = el.width + dx }
            if (resizeHandle.includes('w')) { newX = el.x + dx; newW = el.width - dx }
            if (resizeHandle.includes('s')) { newH = el.height + dy }
            if (resizeHandle.includes('n')) { newY = el.y + dy; newH = el.height - dy }

            updateElement(el.id, { x: newX, y: newY, width: newW, height: newH })
            return
        }

        // Handle rotation
        if (isRotating && resizeStart && rotateStart) {
            const el = resizeStart.el
            const cx = el.x + el.width / 2
            const cy = el.y + el.height / 2
            const currentAngle = Math.atan2(y - cy, x - cx)
            const newRotation = rotateStart.elRotation + (currentAngle - rotateStart.angle)
            updateElement(el.id, { rotation: newRotation })
            return
        }

        // Handle box selection
        if (isBoxSelecting) {
            setBoxSelectEnd({ x, y })
            // Select elements within the box
            const selBounds = {
                x: Math.min(boxSelectStart.x, x),
                y: Math.min(boxSelectStart.y, y),
                width: Math.abs(x - boxSelectStart.x),
                height: Math.abs(y - boxSelectStart.y),
            }
            const inBox = getElementsInSelection(elements, selBounds)
            selectElements(inBox.map(e => e.id))
            return
        }

        // Handle lasso selection
        if (lassoMode && isDrawing) {
            setLassoPoints([...lassoPoints, [x, y]])
            return
        }

        if (!isDrawing) return

        // Move selected elements (supports multi-select)
        if (currentTool === 'select' && selectedElementIds.length > 0) {
            const firstEl = elements.find((el) => el.id === selectedElementIds[0])
            if (firstEl) {
                const newX = x - startPos.x
                const newY = y - startPos.y
                const deltaX = newX - firstEl.x
                const deltaY = newY - firstEl.y

                // Move all selected elements
                selectedElementIds.forEach(id => {
                    const el = elements.find(e => e.id === id)
                    if (el) {
                        updateElement(id, { x: el.x + deltaX, y: el.y + deltaY })
                        // Also move bound text
                        const boundTexts = elements.filter(e => e.containerId === id)
                        boundTexts.forEach(textEl => {
                            updateElement(textEl.id, { x: textEl.x + deltaX, y: textEl.y + deltaY })
                        })
                    }
                })
                // Update startPos offset for the first element
                setStartPos({ x: x - (firstEl.x + deltaX), y: y - (firstEl.y + deltaY) })
            }
            return
        }

        // Update current element being drawn
        if (currentElement) {
            if (currentElement.type === 'freedraw') {
                const newPoints = [...(currentElement.points || []), [x, y]]
                setCurrentElement({
                    ...currentElement,
                    points: newPoints,
                    width: 1,
                    height: 1,
                })
            } else {
                setCurrentElement({
                    ...currentElement,
                    width: x - startPos.x,
                    height: y - startPos.y,
                })
            }
        }
    }

    const handleMouseUp = () => {
        if (isPanning) {
            setIsPanning(false)
            return
        }

        if (isErasing) {
            setIsErasing(false)
            saveToHistory()
            return
        }

        if (isResizing) {
            setIsResizing(false)
            setResizeHandle(null)
            setResizeStart(null)
            saveToHistory()
            return
        }

        if (isRotating) {
            setIsRotating(false)
            setRotateStart(null)
            setResizeStart(null)
            saveToHistory()
            return
        }

        if (isBoxSelecting) {
            setIsBoxSelecting(false)
            return
        }

        // Handle lasso selection completion
        if (lassoMode && lassoPoints.length > 2) {
            const selectedIds = elements
                .filter(el => {
                    const bounds = getElementBounds(el)
                    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
                    return pointInPolygon(center.x, center.y, lassoPoints)
                })
                .map(el => el.id)
            selectElements(selectedIds)
            setLassoPoints([])
            setLassoMode(false)
            setIsDrawing(false)
            return
        }

        if (!isDrawing) return
        setIsDrawing(false)

        if (currentElement && currentTool !== 'select') {
            // Normalize negative dimensions
            let { x, y, width, height } = currentElement
            let elementAdded = false

            if (currentElement.type === 'freedraw') {
                // For freedraw, add if there are points
                if (currentElement.points && currentElement.points.length > 1) {
                    addElement(currentElement)
                    saveToHistory()
                    elementAdded = true
                }
            } else if (currentElement.type === 'line' || currentElement.type === 'arrow') {
                // For lines and arrows, check the distance (not just width/height)
                const dist = Math.sqrt(width * width + height * height)
                if (dist > 5) {
                    addElement({ ...currentElement, x, y, width, height })
                    saveToHistory()
                    elementAdded = true
                }
            } else {
                // For shapes (rectangle, ellipse, diamond)
                if (width < 0) { x += width; width = -width }
                if (height < 0) { y += height; height = -height }

                if (width > 2 || height > 2) {
                    addElement({ ...currentElement, x, y, width, height })
                    saveToHistory()
                    elementAdded = true
                }
            }
            setCurrentElement(null)

            // Switch back to select tool after drawing (unless tool lock is enabled)
            if (elementAdded && !keepSelectedTool) {
                setTool('select')
            }
        } else if (currentTool === 'select') {
            saveToHistory()
        }
    }

    // Zoom with scroll
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()

        // Get mouse position for zoom center
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const delta = e.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.max(0.1, Math.min(5, zoom * delta))

        // Zoom towards mouse position
        const newScrollX = mouseX - (mouseX - scrollX) * (newZoom / zoom)
        const newScrollY = mouseY - (mouseY - scrollY) * (newZoom / zoom)

        setZoom(newZoom)
        setScroll(newScrollX, newScrollY)
    }

    // Export handlers
    const handleExportPNG = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const link = document.createElement('a')
        link.download = `${sceneName}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
    }

    const handleExportSVG = () => {
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" style="background:${canvasBg}">`

        elements.forEach((el) => {
            const style = `stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" fill="${el.fillColor === 'transparent' ? 'none' : el.fillColor}" opacity="${el.opacity}"`

            switch (el.type) {
                case 'rectangle':
                    svg += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" ${style}/>`
                    break
                case 'ellipse':
                    svg += `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${Math.abs(el.width) / 2}" ry="${Math.abs(el.height) / 2}" ${style}/>`
                    break
                case 'line':
                case 'arrow':
                    svg += `<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.width}" y2="${el.y + el.height}" ${style}/>`
                    break
                case 'text':
                    svg += `<text x="${el.x}" y="${el.y + 20}" fill="${el.strokeColor}" font-size="${el.fontSize || 20}">${el.text}</text>`
                    break
            }
        })

        svg += '</svg>'

        const blob = new Blob([svg], { type: 'image/svg+xml' })
        const link = document.createElement('a')
        link.download = `${sceneName}.svg`
        link.href = URL.createObjectURL(blob)
        link.click()
    }

    const handleExportJSON = () => {
        const data = exportScene()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const link = document.createElement('a')
        link.download = `${sceneName}.json`
        link.href = URL.createObjectURL(blob)
        link.click()
    }

    const handleSaveName = () => {
        if (sceneId) {
            updateScene(sceneId, { name: sceneName })
        }
        setIsEditingName(false)
    }

    const handleDeleteScene = async () => {
        const confirmed = confirm('Are you sure you want to delete this scene?')
        if (confirmed && sceneId) {
            await deleteScene(sceneId)
            navigate('/')
        }
    }

    const getCursor = () => {
        if (isPanning) return 'grabbing'
        if (spacePressed || currentTool === 'hand') return 'grab'
        if (isResizing) {
            if (resizeHandle === 'nw' || resizeHandle === 'se') return 'nwse-resize'
            if (resizeHandle === 'ne' || resizeHandle === 'sw') return 'nesw-resize'
            if (resizeHandle === 'n' || resizeHandle === 's') return 'ns-resize'
            if (resizeHandle === 'e' || resizeHandle === 'w') return 'ew-resize'
            return 'move'
        }
        if (isRotating) return 'grabbing'
        if (currentTool === 'select') return 'default'
        if (currentTool === 'text') return 'text'
        if (currentTool === 'eraser') return 'crosshair'
        return 'crosshair'
    }

    return (
        <div className="excalidraw-editor">
            {/* Top Toolbar - Excalidraw style */}
            <div className="excalidraw-toolbar">
                {/* Left: Logo & Menu */}
                <div className="toolbar-section toolbar-left">
                    <button className="toolbar-btn menu-btn" onClick={() => setShowMenu(!showMenu)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>

                    {showMenu && (
                        <div className="dropdown-menu toolbar-dropdown">
                            <button className="dropdown-item" onClick={() => { navigate('/'); setShowMenu(false); }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                </svg>
                                Back to Dashboard
                            </button>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item" onClick={() => {
                                const input = document.createElement('input')
                                input.type = 'file'
                                input.accept = '.json'
                                input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0]
                                    if (file) {
                                        const reader = new FileReader()
                                        reader.onload = (event) => {
                                            try {
                                                const data = JSON.parse(event.target?.result as string)
                                                if (data.elements && data.appState) {
                                                    loadScene(data.elements, data.appState)
                                                }
                                            } catch (err) {
                                                console.error('Failed to load file:', err)
                                            }
                                        }
                                        reader.readAsText(file)
                                    }
                                }
                                input.click()
                                setShowMenu(false)
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                </svg>
                                Open File
                            </button>
                            <button className="dropdown-item" onClick={() => {
                                const data = exportScene()
                                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                                const link = document.createElement('a')
                                link.download = `${sceneName}.json`
                                link.href = URL.createObjectURL(blob)
                                link.click()
                                setShowMenu(false)
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                    <polyline points="17 21 17 13 7 13 7 21" />
                                    <polyline points="7 3 7 8 15 8" />
                                </svg>
                                Save As File
                            </button>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item" onClick={handleExportPNG}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21,15 16,10 5,21" />
                                </svg>
                                Export as PNG
                            </button>
                            <button className="dropdown-item" onClick={handleExportSVG}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14,2 14,8 20,8" />
                                </svg>
                                Export as SVG
                            </button>
                            <button className="dropdown-item" onClick={handleExportJSON}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14,2 14,8 20,8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                                Export as JSON
                            </button>
                            <button className="dropdown-item" onClick={clearCanvas}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3,6 5,6 21,6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Clear Canvas
                            </button>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item" onClick={() => {
                                alert('📋 Keyboard Shortcuts\n\nTools:\nCtrl+1: Select | Ctrl+2: Rectangle | Ctrl+3: Ellipse\nCtrl+4: Diamond | Ctrl+5: Line | Ctrl+6: Arrow\nCtrl+7: Pencil | Ctrl+8: Text | Ctrl+9: Eraser | Ctrl+O: Image\n\nEditing:\nCtrl+Z: Undo | Ctrl+Y: Redo\nCtrl+C: Copy | Ctrl+X: Cut | Ctrl+V: Paste | Ctrl+D: Duplicate\nCtrl+G: Group | Delete: Delete | Esc: Deselect\n\nLayers:\nCtrl+]: Bring Forward | Ctrl+[: Send Backward\nCtrl+Shift+]: Bring to Front | Ctrl+Shift+[: Send to Back\n\nOther:\nCtrl+F: Find | Ctrl+/: Command Palette\nSpace: Pan | Ctrl+L: Add Link\nCtrl+Shift+L: Lasso Select')
                                setShowMenu(false)
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4" />
                                    <path d="M12 8h.01" />
                                </svg>
                                Shortcuts & Help
                            </button>
                            <button className="dropdown-item" onClick={() => {
                                const data = exportScene()
                                const encoded = btoa(JSON.stringify(data))
                                const shareUrl = `${window.location.origin}/?drawing=${encoded}`
                                navigator.clipboard.writeText(shareUrl)
                                alert('Share link copied to clipboard!')
                                setShowMenu(false)
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                                </svg>
                                Share Drawing
                            </button>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item danger" onClick={handleDeleteScene}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3,6 5,6 21,6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                                Delete Scene
                            </button>
                        </div>
                    )}
                </div>

                {/* Center: Tools */}
                <div className="toolbar-section toolbar-center">
                    <div className="tools-group">
                        {TOOLS.map((tool) => (
                            <button
                                key={tool.id}
                                className={`tool-btn ${currentTool === tool.id ? 'active' : ''}`}
                                onClick={() => setTool(tool.id)}
                                title={`${tool.label} (${tool.shortcut})`}
                            >
                                {ToolIcons[tool.id]}
                            </button>
                        ))}
                        {/* Tool Lock Button */}
                        <button
                            className={`tool-btn ${keepSelectedTool ? 'active' : ''}`}
                            onClick={() => setKeepSelectedTool(!keepSelectedTool)}
                            title={`Keep selected tool after drawing (${keepSelectedTool ? 'ON' : 'OFF'})`}
                            style={{ marginLeft: '8px' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {keepSelectedTool ? (
                                    <>
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </>
                                ) : (
                                    <>
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                    </>
                                )}
                            </svg>
                        </button>

                        {/* Image Upload Button */}
                        <button
                            className="tool-btn"
                            onClick={() => imageInputRef.current?.click()}
                            title="Insert Image"
                            style={{ marginLeft: '4px' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21,15 16,10 5,21" />
                            </svg>
                        </button>

                        {/* Library Button */}
                        <button
                            className="tool-btn"
                            onClick={() => setLibraryDialog(true)}
                            title="Shape Library"
                            style={{ marginLeft: '4px' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                        </button>

                        {/* Find Button */}
                        <button
                            className="tool-btn"
                            onClick={() => setFindDialog(true)}
                            title="Find (Ctrl+F)"
                            style={{ marginLeft: '4px' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        </button>

                        {/* Command Palette Button */}
                        <button
                            className="tool-btn"
                            onClick={() => setCommandPalette(true)}
                            title="Command Palette (Ctrl+/)"
                            style={{ marginLeft: '4px' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3" />
                                <line x1="12" y1="12" x2="20" y2="7.5" />
                                <line x1="12" y1="12" x2="12" y2="21" />
                                <line x1="12" y1="12" x2="4" y2="7.5" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Right: Scene name & Actions */}
                <div className="toolbar-section toolbar-right">
                    {isEditingName ? (
                        <input
                            type="text"
                            className="scene-name-input"
                            value={sceneName}
                            onChange={(e) => setSceneName(e.target.value)}
                            onBlur={handleSaveName}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            autoFocus
                        />
                    ) : (
                        <button className="scene-name-btn" onClick={() => setIsEditingName(true)}>
                            {sceneName}
                        </button>
                    )}

                    <div className="action-buttons">
                        <button className="toolbar-btn" onClick={undo} title="Undo (Ctrl+Z)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 7v6h6" />
                                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                            </svg>
                        </button>
                        <button className="toolbar-btn" onClick={redo} title="Redo (Ctrl+Y)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 7v6h-6" />
                                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
                            </svg>
                        </button>
                        <button
                            className="toolbar-btn"
                            onClick={() => {
                                setDarkMode(!darkMode)
                                setCanvasBg(darkMode ? '#ffffff' : '#121212')
                            }}
                            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {darkMode ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="5" />
                                    <line x1="12" y1="1" x2="12" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="23" />
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                    <line x1="1" y1="12" x2="3" y2="12" />
                                    <line x1="21" y1="12" x2="23" y2="12" />
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Left Sidebar - Properties */}
            <div className="excalidraw-sidebar left" style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
                <div className="sidebar-section">
                    <div className="section-title">Stroke</div>
                    <div className="color-picker">
                        {STROKE_COLORS.map((color) => (
                            <button
                                key={color}
                                className={`color-btn ${strokeColor === color ? 'active' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                    setStrokeColor(color);
                                    if (selectedElementIds.length > 0) {
                                        selectedElementIds.forEach(id => updateElement(id, { strokeColor: color }));
                                        saveToHistory();
                                    }
                                }}
                            />
                        ))}
                    </div>
                    {/* Custom color input */}
                    <div style={{ marginTop: '6px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                            type="color"
                            value={strokeColor}
                            onChange={(e) => {
                                setStrokeColor(e.target.value);
                                if (selectedElementIds.length > 0) {
                                    selectedElementIds.forEach(id => updateElement(id, { strokeColor: e.target.value }));
                                    saveToHistory();
                                }
                            }}
                            style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                        />
                        <input
                            type="text"
                            value={strokeColor}
                            onChange={(e) => {
                                setStrokeColor(e.target.value);
                                if (selectedElementIds.length > 0) {
                                    selectedElementIds.forEach(id => updateElement(id, { strokeColor: e.target.value }));
                                }
                            }}
                            onBlur={() => saveToHistory()}
                            style={{ flex: 1, padding: '4px 6px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', outline: 'none' }}
                        />
                    </div>
                </div>

                <div className="sidebar-section">
                    <div className="section-title">Fill</div>
                    <div className="color-picker">
                        {FILL_COLORS.map((color) => (
                            <button
                                key={color}
                                className={`color-btn ${fillColor === color ? 'active' : ''} ${color === 'transparent' ? 'transparent' : ''}`}
                                style={{ backgroundColor: color === 'transparent' ? undefined : color }}
                                onClick={() => {
                                    setFillColor(color);
                                    if (selectedElementIds.length > 0) {
                                        selectedElementIds.forEach(id => updateElement(id, { fillColor: color }));
                                        saveToHistory();
                                    }
                                }}
                            />
                        ))}
                    </div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                            type="color"
                            value={fillColor === 'transparent' ? '#000000' : fillColor}
                            onChange={(e) => {
                                setFillColor(e.target.value);
                                if (selectedElementIds.length > 0) {
                                    selectedElementIds.forEach(id => updateElement(id, { fillColor: e.target.value }));
                                    saveToHistory();
                                }
                            }}
                            style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                        />
                        <input
                            type="text"
                            value={fillColor}
                            onChange={(e) => {
                                setFillColor(e.target.value);
                                if (selectedElementIds.length > 0) {
                                    selectedElementIds.forEach(id => updateElement(id, { fillColor: e.target.value }));
                                }
                            }}
                            onBlur={() => saveToHistory()}
                            style={{ flex: 1, padding: '4px 6px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', outline: 'none' }}
                        />
                    </div>
                </div>

                <div className="sidebar-section">
                    <div className="section-title">Stroke Width</div>
                    <div className="stroke-picker">
                        {[1, 2, 3, 4].map((w) => (
                            <button
                                key={w}
                                className={`stroke-btn ${strokeWidth === w ? 'active' : ''}`}
                                onClick={() => {
                                    setStrokeWidth(w);
                                    if (selectedElementIds.length > 0) {
                                        selectedElementIds.forEach(id => updateElement(id, { strokeWidth: w }));
                                        saveToHistory();
                                    }
                                }}
                            >
                                <div className="stroke-preview" style={{ height: w * 2 }} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="sidebar-section">
                    <div className="section-title">Stroke Style</div>
                    <div className="stroke-picker">
                        {(['solid', 'dashed', 'dotted'] as const).map((style) => (
                            <button
                                key={style}
                                className={`stroke-btn ${strokeStyle === style ? 'active' : ''}`}
                                onClick={() => {
                                    setStrokeStyle(style);
                                    if (selectedElementIds.length > 0) {
                                        selectedElementIds.forEach(id => updateElement(id, { strokeStyle: style }));
                                        saveToHistory();
                                    }
                                }}
                                title={style.charAt(0).toUpperCase() + style.slice(1)}
                            >
                                <svg width="24" height="4" viewBox="0 0 24 4">
                                    {style === 'solid' && <line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" strokeWidth="2" />}
                                    {style === 'dashed' && <line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="6,4" />}
                                    {style === 'dotted' && <line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="2,4" />}
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="sidebar-section">
                    <div className="section-title">Fill Style</div>
                    <div className="stroke-picker">
                        {(['solid', 'hachure', 'cross-hatch', 'zigzag'] as const).map((style) => (
                            <button
                                key={style}
                                className={`stroke-btn ${fillStyle === style ? 'active' : ''}`}
                                style={{ fontSize: '9px', padding: '2px' }}
                                onClick={() => {
                                    setFillStyle(style);
                                    if (selectedElementIds.length > 0) {
                                        selectedElementIds.forEach(id => updateElement(id, { fillStyle: style }));
                                        saveToHistory();
                                    }
                                }}
                                title={style}
                            >
                                {style === 'solid' ? '■' : style === 'hachure' ? '▤' : style === 'cross-hatch' ? '▩' : '▨'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="sidebar-section">
                    <div className="section-title">Sloppiness</div>
                    <div className="stroke-picker">
                        {[{ val: 0, label: '📐', title: 'Architect' }, { val: 1, label: '✏️', title: 'Artist' }, { val: 3, label: '🖍️', title: 'Cartoonist' }].map(({ val, label, title }) => (
                            <button
                                key={val}
                                className={`stroke-btn ${roughness === val ? 'active' : ''}`}
                                onClick={() => {
                                    setRoughness(val);
                                    if (selectedElementIds.length > 0) {
                                        selectedElementIds.forEach(id => updateElement(id, { roughness: val }));
                                        saveToHistory();
                                    }
                                }}
                                title={title}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="sidebar-section">
                    <div className="section-title">Edges</div>
                    <div className="stroke-picker">
                        <button
                            className={`stroke-btn ${roundness === 0 ? 'active' : ''}`}
                            onClick={() => {
                                setRoundness(0);
                                if (selectedElementIds.length > 0) {
                                    selectedElementIds.forEach(id => updateElement(id, { roundness: 0 }));
                                    saveToHistory();
                                }
                            }}
                            title="Sharp"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="2" width="12" height="12" />
                            </svg>
                        </button>
                        <button
                            className={`stroke-btn ${roundness === 1 ? 'active' : ''}`}
                            onClick={() => {
                                setRoundness(1);
                                if (selectedElementIds.length > 0) {
                                    selectedElementIds.forEach(id => updateElement(id, { roundness: 1 }));
                                    saveToHistory();
                                }
                            }}
                            title="Round"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="2" width="12" height="12" rx="4" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="sidebar-section">
                    <div className="section-title">Opacity</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round(opacity * 100)}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) / 100;
                                setOpacity(val);
                                if (selectedElementIds.length > 0) {
                                    selectedElementIds.forEach(id => updateElement(id, { opacity: val }));
                                }
                            }}
                            onMouseUp={() => saveToHistory()}
                            className="opacity-slider"
                            style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: '11px', color: '#9ca3af', minWidth: '30px', textAlign: 'right' }}>
                            {Math.round(opacity * 100)}%
                        </span>
                    </div>
                </div>

                <div className="sidebar-section">
                    <div className="section-title">Background</div>
                    <div className="color-picker">
                        {BG_COLORS.map((color) => (
                            <button
                                key={color}
                                className={`color-btn ${canvasBg === color ? 'active' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setCanvasBg(color)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <div
                ref={containerRef}
                className="excalidraw-canvas-container"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
                style={{ cursor: getCursor() }}
            >
                <canvas ref={canvasRef} />
            </div>

            {/* Inline Text Input - positioned at click location using portal */}
            {textInput.visible && createPortal(
                <textarea
                    ref={textInputRef}
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    autoFocus
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        left: `${textInput.x}px`,
                        top: `${textInput.y}px`,
                        zIndex: 10000,
                        background: 'rgba(0,0,0,0.8)',
                        border: '2px solid #6965db',
                        borderRadius: '4px',
                        outline: 'none',
                        resize: 'none',
                        overflow: 'hidden',
                        minWidth: '200px',
                        minHeight: '32px',
                        padding: '6px 8px',
                        fontSize: '20px',
                        fontFamily: '"Segoe UI", system-ui, sans-serif',
                        color: '#ffffff',
                        caretColor: '#ffffff',
                        lineHeight: 1.2,
                    }}
                    placeholder="Type here..."
                    onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (textValue.trim()) {
                                const container = findContainerAtPoint(textInput.canvasX, textInput.canvasY)
                                addElement({
                                    type: 'text',
                                    x: textInput.canvasX,
                                    y: textInput.canvasY,
                                    width: textValue.length * 10,
                                    height: 24,
                                    strokeColor, fillColor, strokeWidth, opacity: 1,
                                    roughness: 1,
                                    text: textValue.trim(),
                                    fontSize: 20,
                                    containerId: container?.id,
                                })
                                saveToHistory()
                            }
                            setTextInput({ ...textInput, visible: false })
                            setTextValue('')
                            if (!keepSelectedTool) setTool('select')
                        }
                        if (e.key === 'Escape') {
                            setTextInput({ ...textInput, visible: false })
                            setTextValue('')
                            if (!keepSelectedTool) setTool('select')
                        }
                    }}
                    onBlur={() => {
                        // Prevent immediate blur when textarea was just created
                        if (Date.now() - textInputCreatedAt.current < 200) {
                            textInputRef.current?.focus()
                            return
                        }
                        // If text was just saved by handleMouseDown, skip duplicate save
                        if (textJustSaved.current) {
                            textJustSaved.current = false
                            return
                        }
                        if (textValue.trim()) {
                            const container = findContainerAtPoint(textInput.canvasX, textInput.canvasY)
                            addElement({
                                type: 'text',
                                x: textInput.canvasX,
                                y: textInput.canvasY,
                                width: textValue.length * 10,
                                height: 24,
                                strokeColor, fillColor, strokeWidth, opacity: 1,
                                roughness: 1,
                                text: textValue.trim(),
                                fontSize: 20,
                                containerId: container?.id,
                            })
                            saveToHistory()
                            if (!keepSelectedTool) setTool('select')
                        }
                        setTextInput({ ...textInput, visible: false })
                        setTextValue('')
                    }}
                />,
                document.body
            )}


            {/* Bottom Zoom Controls */}
            <div className="excalidraw-zoom-controls">
                <button className="zoom-btn" onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}>−</button>
                <button className="zoom-btn zoom-percent" onClick={() => { setZoom(1); setScroll(0, 0); }}>
                    {Math.round(zoom * 100)}%
                </button>
                <button className="zoom-btn" onClick={() => setZoom(Math.min(5, zoom + 0.1))}>+</button>
                {/* Copy to clipboard as PNG */}
                <button
                    className="zoom-btn"
                    title="Copy canvas to clipboard"
                    onClick={async () => {
                        const canvas = canvasRef.current
                        if (!canvas) return
                        try {
                            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
                            if (blob) {
                                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                            }
                        } catch (err) {
                            console.error('Failed to copy to clipboard:', err)
                        }
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                </button>
            </div>

            {/* Right-Click Context Menu */}
            {contextMenu && createPortal(
                <div
                    className="context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button className="dropdown-item" onClick={() => { cutSelected(); setContextMenu(null); }} disabled={selectedElementIds.length === 0}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
                        Cut <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>Ctrl+X</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { copySelected(); setContextMenu(null); }} disabled={selectedElementIds.length === 0}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>Ctrl+C</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { pasteClipboard(); setContextMenu(null); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                        Paste <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>Ctrl+V</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { duplicateSelected(); setContextMenu(null); }} disabled={selectedElementIds.length === 0}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Duplicate <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>Ctrl+D</span>
                    </button>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item" onClick={() => { bringToFront(selectedElementIds); setContextMenu(null); }} disabled={selectedElementIds.length === 0}>
                        ⬆️ Bring to Front <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>Ctrl+Shift+]</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { sendToBack(selectedElementIds); setContextMenu(null); }} disabled={selectedElementIds.length === 0}>
                        ⬇️ Send to Back <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>Ctrl+Shift+[</span>
                    </button>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item" onClick={() => { copyStyle(); setContextMenu(null); }} disabled={selectedElementIds.length === 0}>
                        🎨 Copy Style
                    </button>
                    <button className="dropdown-item" onClick={() => { pasteStyle(); setContextMenu(null); }} disabled={selectedElementIds.length === 0}>
                        🎨 Paste Style
                    </button>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item" onClick={() => { groupSelected(); setContextMenu(null); }} disabled={selectedElementIds.length < 2}>
                        📦 Group <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>Ctrl+G</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { ungroupSelected(); setContextMenu(null); }} disabled={selectedElementIds.length === 0}>
                        📤 Ungroup <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>Ctrl+Shift+G</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { flipHorizontal(); setContextMenu(null); }} disabled={selectedElementIds.length === 0}>
                        ↔️ Flip Horizontal
                    </button>
                    <button className="dropdown-item" onClick={() => { flipVertical(); setContextMenu(null); }} disabled={selectedElementIds.length === 0}>
                        ↕️ Flip Vertical
                    </button>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item" onClick={() => {
                        const element = elements.find(el => el.id === selectedElementIds[0])
                        if (element) {
                            setLinkDialog({ x: 0, y: 0, url: element.link || '', elementId: element.id })
                        }
                        setContextMenu(null)
                    }} disabled={selectedElementIds.length === 0}>
                        🔗 Add Link <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>Ctrl+L</span>
                    </button>
                    <button className="dropdown-item" onClick={() => {
                        toggleLockSelected()
                        setContextMenu(null)
                    }} disabled={selectedElementIds.length === 0}>
                        🔒 Toggle Lock
                    </button>
                    <button className="dropdown-item" onClick={() => {
                        const selected = elements.filter(el => selectedElementIds.includes(el.id))
                        const newLibrary = [...library, ...selected.map(el => ({ ...el, id: uuidv4() }))]
                        setLibrary(newLibrary)
                        setContextMenu(null)
                    }} disabled={selectedElementIds.length === 0}>
                        📚 Add to Library
                    </button>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item danger" onClick={() => { deleteElements(selectedElementIds); setContextMenu(null); }} disabled={selectedElementIds.length === 0}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Delete <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>Del</span>
                    </button>
                </div>,
                document.body
            )}

            {/* Hidden image input */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
            />

            {/* Link Dialog */}
            {linkDialog && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
                    <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '20px', minWidth: '300px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ margin: '0 0 12px 0', color: '#fff' }}>Add Link</h3>
                        <input
                            type="text"
                            placeholder="https://example.com"
                            value={linkDialog.url}
                            onChange={(e) => setLinkDialog({ ...linkDialog, url: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveLink(linkDialog.url)
                                if (e.key === 'Escape') setLinkDialog(null)
                            }}
                            autoFocus
                            style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleSaveLink(linkDialog.url)} style={{ flex: 1, padding: '8px', background: '#6965db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Save
                            </button>
                            <button onClick={() => setLinkDialog(null)} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Find Dialog */}
            {findDialog && createPortal(
                <div style={{ position: 'fixed', top: '80px', right: '20px', background: '#1e1e1e', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.2)', zIndex: 10001 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Find text..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setFindDialog(false)
                                    setSearchText('')
                                }
                            }}
                            autoFocus
                            style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', outline: 'none', minWidth: '200px' }}
                        />
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{findElements().length} found</span>
                        <button onClick={() => { setFindDialog(false); setSearchText('') }} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
                    </div>
                </div>,
                document.body
            )}

            {/* Command Palette */}
            {commandPalette && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 10002, paddingTop: '100px' }}>
                    <div style={{ background: '#1e1e1e', borderRadius: '8px', width: '90%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.2)', maxHeight: '400px', overflowY: 'auto' }}>
                        <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <input
                                type="text"
                                placeholder="Search commands..."
                                autoFocus
                                style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', outline: 'none' }}
                            />
                        </div>
                        <div style={{ padding: '8px 0' }}>
                            {[
                                { label: 'Undo (Ctrl+Z)', action: () => { undo(); setCommandPalette(false) } },
                                { label: 'Redo (Ctrl+Y)', action: () => { redo(); setCommandPalette(false) } },
                                { label: 'Copy (Ctrl+C)', action: () => { copySelected(); setCommandPalette(false) } },
                                { label: 'Paste (Ctrl+V)', action: () => { pasteClipboard(); setCommandPalette(false) } },
                                { label: 'Duplicate (Ctrl+D)', action: () => { duplicateSelected(); setCommandPalette(false) } },
                                { label: 'Delete', action: () => { deleteElements(selectedElementIds); setCommandPalette(false) } },
                                { label: 'Clear Canvas', action: () => { clearCanvas(); setCommandPalette(false) } },
                                { label: 'Export as PNG', action: handleExportPNG },
                                { label: 'Export as SVG', action: handleExportSVG },
                                { label: 'Export as JSON', action: handleExportJSON },
                            ].map((cmd, i) => (
                                <button
                                    key={i}
                                    onClick={cmd.action}
                                    style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#fff', textAlign: 'left', cursor: 'pointer', transition: 'background 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(105, 101, 219, 0.3)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    {cmd.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Library Manager */}
            {libraryDialog && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10003 }}>
                    <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '20px', minWidth: '400px', maxHeight: '500px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>Shape Library ({library.length})</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                            {library.map((el, i) => (
                                <div
                                    key={i}
                                    onClick={() => {
                                        const newEl = { ...el, id: uuidv4() }
                                        addElement(newEl)
                                        saveToHistory()
                                    }}
                                    style={{ padding: '8px', background: 'rgba(105, 101, 219, 0.2)', border: '1px solid rgba(105, 101, 219, 0.5)', borderRadius: '4px', cursor: 'pointer', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}
                                >
                                    {el.type} #{i + 1}
                                </div>
                            ))}
                        </div>
                        <button onClick={() => { setLibraryDialog(false); setLibrary([]) }} style={{ width: '100%', padding: '8px', background: '#6965db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Clear Library
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Frame Dialog */}
            {frameDialog && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10004 }}>
                    <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '20px', minWidth: '300px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ margin: '0 0 12px 0', color: '#fff' }}>Create Frame</h3>
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>Draw the frame on the canvas after entering a name</p>
                        <input
                            type="text"
                            placeholder="Frame name..."
                            value={frameName}
                            onChange={(e) => setFrameName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setFrameDialog(false)
                                    setIsDrawing(true)
                                    setStartPos({ x: 100, y: 100 })
                                }
                                if (e.key === 'Escape') setFrameDialog(false)
                            }}
                            autoFocus
                            style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => {
                                setFrameDialog(false)
                                setIsDrawing(true)
                                setStartPos({ x: 100, y: 100 })
                            }} style={{ flex: 1, padding: '8px', background: '#6965db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Create
                            </button>
                            <button onClick={() => setFrameDialog(false)} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Web Embed Dialog */}
            {webembedDialog && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10005 }}>
                    <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '20px', minWidth: '300px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ margin: '0 0 12px 0', color: '#fff' }}>Embed Web Content</h3>
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>Enter URL & draw embed container on canvas</p>
                        <input
                            type="text"
                            placeholder="https://example.com"
                            value={embedUrl}
                            onChange={(e) => setEmbedUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setWebembedDialog(false)
                                    setIsDrawing(true)
                                }
                                if (e.key === 'Escape') setWebembedDialog(false)
                            }}
                            autoFocus
                            style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => {
                                setWebembedDialog(false)
                                setIsDrawing(true)
                            }} style={{ flex: 1, padding: '8px', background: '#6965db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Embed
                            </button>
                            <button onClick={() => setWebembedDialog(false)} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
