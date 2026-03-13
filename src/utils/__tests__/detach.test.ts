import { describe, expect, it } from 'vitest'
import { clearAllDetached, detach, Reason } from '../detach.ts'

describe('detach utility', () => {
  it('GIVEN a resolved promise WHEN detached THEN does not throw', () => {
    expect(() => detach(Promise.resolve('ok'), Reason.DomCallback)).not.toThrow()
  })

  it('GIVEN a promise rejecting with abort error WHEN detached THEN error is silenced', async () => {
    const abortError = new DOMException('cancelled', 'AbortError')
    detach(Promise.reject(abortError), Reason.DomCallback)

    await clearAllDetached()
  })

  it('GIVEN a non-promise value WHEN detached THEN does nothing', () => {
    expect(() => detach('not a promise', Reason.JsCall)).not.toThrow()
    expect(() => detach(42, Reason.JsCall)).not.toThrow()
    expect(() => detach(undefined, Reason.JsCall)).not.toThrow()
  })

  it('GIVEN a promise rejecting with real error WHEN detached THEN error propagates via clearAllDetached', async () => {
    const realError = new Error('real error')
    detach(Promise.reject(realError), Reason.DomCallback)

    await expect(clearAllDetached()).rejects.toThrow('real error')
  })
})
