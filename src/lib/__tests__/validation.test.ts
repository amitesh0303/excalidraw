/**
 * Tests for validation schemas
 */

import { describe, it, expect } from 'vitest'
import { 
  sceneNameSchema, 
  folderNameSchema, 
  emailSchema,
  passwordSchema,
  validateInput 
} from '../validation'

describe('validation', () => {
  describe('sceneNameSchema', () => {
    it('should accept valid scene names', () => {
      expect(validateInput(sceneNameSchema, 'My Scene')).toBe('My Scene')
      expect(validateInput(sceneNameSchema, 'Scene-123')).toBe('Scene-123')
      expect(validateInput(sceneNameSchema, 'Project_2024')).toBe('Project_2024')
      expect(validateInput(sceneNameSchema, 'Drawing (v2)')).toBe('Drawing (v2)')
    })

    it('should reject empty names', () => {
      expect(() => validateInput(sceneNameSchema, '')).toThrow('Scene name is required')
    })

    it('should reject whitespace-only names', () => {
      expect(() => validateInput(sceneNameSchema, '   ')).toThrow('Scene name is required')
    })

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(101)
      expect(() => validateInput(sceneNameSchema, longName)).toThrow('must be less than 100 characters')
    })

    it('should reject names with invalid characters', () => {
      expect(() => validateInput(sceneNameSchema, 'Scene<script>')).toThrow('invalid characters')
      expect(() => validateInput(sceneNameSchema, 'Scene{}')).toThrow('invalid characters')
      expect(() => validateInput(sceneNameSchema, 'Scene[]')).toThrow('invalid characters')
    })

    it('should trim whitespace', () => {
      expect(validateInput(sceneNameSchema, '  Scene  ')).toBe('Scene')
      expect(validateInput(sceneNameSchema, '\tScene\n')).toBe('Scene')
    })
  })

  describe('folderNameSchema', () => {
    it('should accept valid folder names', () => {
      expect(validateInput(folderNameSchema, 'My Folder')).toBe('My Folder')
      expect(validateInput(folderNameSchema, 'Folder-123')).toBe('Folder-123')
      expect(validateInput(folderNameSchema, 'Project_2024')).toBe('Project_2024')
    })

    it('should reject empty names', () => {
      expect(() => validateInput(folderNameSchema, '')).toThrow('Folder name is required')
    })

    it('should reject whitespace-only names', () => {
      expect(() => validateInput(folderNameSchema, '\t  \n')).toThrow('Folder name is required')
    })

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(51)
      expect(() => validateInput(folderNameSchema, longName)).toThrow('must be less than 50 characters')
    })

    it('should reject names with invalid characters', () => {
      expect(() => validateInput(folderNameSchema, 'Folder<>')).toThrow('invalid characters')
      expect(() => validateInput(folderNameSchema, 'Folder()')).toThrow('invalid characters')
    })

    it('should trim whitespace', () => {
      expect(validateInput(folderNameSchema, '  Folder  ')).toBe('Folder')
    })
  })

  describe('emailSchema', () => {
    it('should accept valid emails', () => {
      expect(validateInput(emailSchema, 'user@example.com')).toBe('user@example.com')
      expect(validateInput(emailSchema, 'test.user@domain.co.uk')).toBe('test.user@domain.co.uk')
    })

    it('should reject invalid emails', () => {
      expect(() => validateInput(emailSchema, 'invalid')).toThrow('Invalid email')
      expect(() => validateInput(emailSchema, 'user@')).toThrow('Invalid email')
      expect(() => validateInput(emailSchema, '@example.com')).toThrow('Invalid email')
    })

    it('should convert to lowercase', () => {
      expect(validateInput(emailSchema, 'USER@EXAMPLE.COM')).toBe('user@example.com')
    })
  })

  describe('passwordSchema', () => {
    it('should accept valid passwords', () => {
      expect(validateInput(passwordSchema, 'Password123')).toBe('Password123')
      expect(validateInput(passwordSchema, 'MyP@ssw0rd!')).toBe('MyP@ssw0rd!')
    })

    it('should reject passwords that are too short', () => {
      expect(() => validateInput(passwordSchema, 'Pass1')).toThrow('at least 8 characters')
    })

    it('should reject passwords without uppercase', () => {
      expect(() => validateInput(passwordSchema, 'password123')).toThrow('uppercase letter')
    })

    it('should reject passwords without lowercase', () => {
      expect(() => validateInput(passwordSchema, 'PASSWORD123')).toThrow('lowercase letter')
    })

    it('should reject passwords without numbers', () => {
      expect(() => validateInput(passwordSchema, 'Password')).toThrow('number')
    })
  })

  describe('validateInput', () => {
    it('should throw error with message from Zod', () => {
      try {
        validateInput(sceneNameSchema, '')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('required')
      }
    })

    it('should return validated value on success', () => {
      const result = validateInput(sceneNameSchema, 'Valid Name')
      expect(result).toBe('Valid Name')
    })
  })
})
