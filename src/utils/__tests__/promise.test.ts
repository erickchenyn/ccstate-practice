import { describe, expect, it } from 'vitest'
import { createDeferredPromise, parallel } from '../promise.ts'

describe('promise utilities', () => {
  describe('createDeferredPromise', () => {
    it('GIVEN a deferred promise WHEN resolved THEN promise resolves with value', async () => {
      const ctrl = new AbortController()
      const { promise, resolve } = createDeferredPromise<string>(ctrl.signal)

      resolve('hello')
      await expect(promise).resolves.toBe('hello')
    })

    it('GIVEN a deferred promise WHEN rejected with abort error THEN promise rejects', async () => {
      const ctrl = new AbortController()
      const { promise, reject } = createDeferredPromise<string>(ctrl.signal)

      const error = new DOMException('cancelled', 'AbortError')
      reject(error)
      await expect(promise).rejects.toBe(error)
    })

    it('GIVEN a deferred promise WHEN signal aborts THEN promise rejects with abort reason', async () => {
      const ctrl = new AbortController()
      const { promise } = createDeferredPromise<string>(ctrl.signal)

      ctrl.abort(new DOMException('cancelled', 'AbortError'))
      await expect(promise).rejects.toBeInstanceOf(DOMException)
    })

    it('GIVEN a resolved deferred promise WHEN resolve is called again THEN throws', async () => {
      const ctrl = new AbortController()
      const { promise, resolve } = createDeferredPromise<string>(ctrl.signal)

      resolve('first')
      await promise
      expect(() => resolve('second')).toThrow('Deferred promise already settled')
    })

    it('GIVEN a deferred promise WHEN settled THEN settled() returns true', async () => {
      const ctrl = new AbortController()
      const { promise, resolve, settled } = createDeferredPromise<string>(ctrl.signal)

      expect(settled()).toBe(false)
      resolve('done')
      await promise
      expect(settled()).toBe(true)
    })
  })

  describe('parallel', () => {
    it('GIVEN multiple promises and active signal WHEN all resolve THEN returns all results', async () => {
      const ctrl = new AbortController()
      const result = await parallel(
        ctrl.signal,
        Promise.resolve(1),
        Promise.resolve('two'),
        Promise.resolve(true),
      )

      expect(result).toEqual([1, 'two', true])
    })

    it('GIVEN an aborted signal WHEN parallel is called THEN throws', () => {
      const ctrl = new AbortController()
      ctrl.abort()

      expect(() => parallel(ctrl.signal, Promise.resolve(1))).toThrow()
    })
  })
})
