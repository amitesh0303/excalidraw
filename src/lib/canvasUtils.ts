/**
 * Canvas utility functions
 * Includes viewport culling for performance optimization
 */

import type { CanvasElement } from '../types/database'

export interface Viewport {
  x: number
  y: number
  width: number
  height: number
  zoom: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Get bounding box for a canvas element
 */
export function getElementBounds(element: CanvasElement): Bounds {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height
  }
}

/**
 * Check if element is visible in viewport
 * Includes buffer zone for smooth rendering
 */
export function isElementVisible(
  element: CanvasElement,
  viewport: Viewport,
  buffer: number = 200
): boolean {
  const bounds = getElementBounds(element)
  
  // Convert viewport coordinates to canvas space
  const viewportLeft = viewport.x - buffer
  const viewportRight = viewport.x + viewport.width + buffer
  const viewportTop = viewport.y - buffer
  const viewportBottom = viewport.y + viewport.height + buffer

  // Check if element intersects with viewport
  return (
    bounds.x + bounds.width >= viewportLeft &&
    bounds.x <= viewportRight &&
    bounds.y + bounds.height >= viewportTop &&
    bounds.y <= viewportBottom
  )
}

/**
 * Filter elements to only those visible in viewport
 * Significantly improves performance for large canvases
 */
export function getVisibleElements(
  elements: CanvasElement[],
  viewport: Viewport
): CanvasElement[] {
  return elements.filter(element => isElementVisible(element, viewport))
}

/**
 * Calculate optimal buffer size based on zoom level
 */
export function getOptimalBuffer(zoom: number): number {
  // Larger buffer at higher zoom levels
  return Math.max(200, 200 * zoom)
}

/**
 * Check if two bounds intersect
 */
export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/**
 * Get elements within a selection rectangle
 */
export function getElementsInSelection(
  elements: CanvasElement[],
  selection: Bounds
): CanvasElement[] {
  return elements.filter(element => {
    const bounds = getElementBounds(element)
    return boundsIntersect(bounds, selection)
  })
}

/**
 * Calculate canvas bounds that contain all elements
 */
export function getCanvasBounds(elements: CanvasElement[]): Bounds | null {
  if (elements.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  elements.forEach(element => {
    const bounds = getElementBounds(element)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  })

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}
