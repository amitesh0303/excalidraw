/**
 * Input validation schemas using Zod
 * Prevents XSS and injection attacks
 */

import { z } from 'zod'

// Scene name validation
export const sceneNameSchema = z.string()
  .min(1, 'Scene name is required')
  .max(100, 'Scene name must be less than 100 characters')
  .regex(/^[a-zA-Z0-9\s\-_.,!?()]+$/, 'Scene name contains invalid characters')
  .transform(name => name.trim())

// Folder name validation
export const folderNameSchema = z.string()
  .min(1, 'Folder name is required')
  .max(50, 'Folder name must be less than 50 characters')
  .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Folder name contains invalid characters')
  .transform(name => name.trim())

// Text content validation (for canvas text elements)
export const textContentSchema = z.string()
  .max(5000, 'Text content is too long')
  .transform(text => text.trim())

// Email validation
export const emailSchema = z.string()
  .email('Invalid email address')
  .toLowerCase()

// Password validation
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// UUID validation
export const uuidSchema = z.string().uuid('Invalid ID format')

// Sanitize HTML to prevent XSS
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div')
  div.textContent = html
  return div.innerHTML
}

// Validate and sanitize user input
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(error.errors[0].message)
    }
    throw error
  }
}
