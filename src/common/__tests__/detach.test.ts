import { describe, expect, it } from 'vitest'
import { clearAllDetached, detach, Reason } from '../detach.ts'

describe('detach utility', () => {
  it('GIVEN a resolved promise WHEN detached THEN does not throw', () => {
    expect(() => detach(Promise.resolve('ok'), Reason.DOM)).not.toThrow()
  })

  it('GIVEN a promise rejecting with abort error WHEN detached THEN error is silenced', async () => {
    const abortError = new DOMException('cancelled', 'AbortError')
    detach(Promise.reject(abortError), Reason.DOM)

    await clearAllDetached()
  })

  it('GIVEN a non-promise value WHEN detached THEN does nothing', () => {
    expect(() => detach('not a promise', Reason.Deferred)).not.toThrow()
    expect(() => detach(42, Reason.Deferred)).not.toThrow()
    expect(() => detach(undefined, Reason.Deferred)).not.toThrow()
  })

  it('GIVEN a promise rejecting with real error WHEN detached THEN error propagates via clearAllDetached', async () => {
    const realError = new Error('real error')
    detach(Promise.reject(realError), Reason.DOM)

    await expect(clearAllDetached()).rejects.toThrow('real error')
  })
})
