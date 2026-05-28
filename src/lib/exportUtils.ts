import type { CanvasElement } from '../types/database'

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

export function exportPNG(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    sceneName: string
): void {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `${sceneName}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
}

export function exportSVG(
    elements: CanvasElement[],
    sceneName: string,
    canvasBg: string
): void {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" style="background:${escapeXml(canvasBg)}">`

    elements.forEach((el) => {
        const strokeColor = escapeXml(el.strokeColor)
        const fillColor = el.fillColor === 'transparent' ? 'none' : escapeXml(el.fillColor)
        const style = `stroke="${strokeColor}" stroke-width="${el.strokeWidth}" fill="${fillColor}" opacity="${el.opacity}"`

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
                svg += `<text x="${el.x}" y="${el.y + 20}" fill="${strokeColor}" font-size="${el.fontSize || 20}">${escapeXml(el.text || '')}</text>`
                break
        }
    })

    svg += '</svg>'

    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.download = `${sceneName}.svg`
    const url = URL.createObjectURL(blob)
    link.href = url
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportJSON(
    exportScene: () => { elements: CanvasElement[]; appState: unknown },
    sceneName: string
): void {
    const data = exportScene()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.download = `${sceneName}.json`
    const url = URL.createObjectURL(blob)
    link.href = url
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
