import { describe, expect, it } from 'vitest'
import { isAbortError, throwIfAbort, throwIfNotAbort } from '../abort.ts'

describe('abort utilities', () => {
  describe('isAbortError', () => {
    it('GIVEN a DOMException with name AbortError WHEN called THEN returns true', () => {
      const error = new DOMException('aborted', 'AbortError')
      expect(isAbortError(error)).toBe(true)
    })

    it('GIVEN a regular Error WHEN called THEN returns false', () => {
      const error = new Error('something went wrong')
      expect(isAbortError(error)).toBe(false)
    })

    it('GIVEN a DOMException with different name WHEN called THEN returns false', () => {
      const error = new DOMException('timeout', 'TimeoutError')
      expect(isAbortError(error)).toBe(false)
    })

    it('GIVEN a string WHEN called THEN returns false', () => {
      expect(isAbortError('some error')).toBe(false)
    })

    it('GIVEN null WHEN called THEN returns false', () => {
      expect(isAbortError(null)).toBe(false)
    })

    it('GIVEN an Error with name AbortError and empty message WHEN called THEN returns true', () => {
      const error = new Error('')
      error.name = 'AbortError'
      expect(isAbortError(error)).toBe(true)
    })

    it('GIVEN an Error with name AbortError and message starting with AbortError: WHEN called THEN returns true', () => {
      const error = new Error('AbortError: some reason')
      error.name = 'AbortError'
      expect(isAbortError(error)).toBe(true)
    })

    it('GIVEN an Error with name AbortError but non-matching message WHEN called THEN returns false', () => {
      const error = new Error('ERR_QUIC_PROTOCOL_ERROR')
      error.name = 'AbortError'
      expect(isAbortError(error)).toBe(false)
    })
  })

  describe('throwIfAbort', () => {
    it('GIVEN an abort error WHEN called THEN throws', () => {
      const error = new DOMException('aborted', 'AbortError')
      expect(() => throwIfAbort(error)).toThrow(DOMException)
    })

    it('GIVEN a non-abort error WHEN called THEN does not throw', () => {
      const error = new Error('something else')
      expect(() => throwIfAbort(error)).not.toThrow()
    })
  })

  describe('throwIfNotAbort', () => {
    it('GIVEN an abort error WHEN called THEN does not throw', () => {
      const error = new DOMException('aborted', 'AbortError')
      expect(() => throwIfNotAbort(error)).not.toThrow()
    })

    it('GIVEN a non-abort error WHEN called THEN throws', () => {
      const error = new Error('real error')
      expect(() => throwIfNotAbort(error)).toThrow(error)
    })
  })
})
