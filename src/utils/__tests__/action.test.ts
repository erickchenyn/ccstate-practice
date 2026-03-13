import { createStore } from 'ccstate'
import { describe, expect, it } from 'vitest'
import { resetSignal, switchSignal } from '../action.ts'

describe('action utilities', () => {
  describe('resetSignal', () => {
    it('GIVEN a resetSignal WHEN called first time THEN returns a non-aborted signal', () => {
      const store = createStore()
      const reset$ = resetSignal()

      const signal = store.set(reset$)
      expect(signal.aborted).toBe(false)
    })

    it('GIVEN a resetSignal called once WHEN called again THEN the previous signal is aborted', () => {
      const store = createStore()
      const reset$ = resetSignal()

      const signal1 = store.set(reset$)
      const signal2 = store.set(reset$)

      expect(signal1.aborted).toBe(true)
      expect(signal2.aborted).toBe(false)
    })

    it('GIVEN a resetSignal WHEN called with external signals THEN returned signal combines them', () => {
      const store = createStore()
      const reset$ = resetSignal()

      const externalCtrl = new AbortController()
      const signal = store.set(reset$, externalCtrl.signal)

      expect(signal.aborted).toBe(false)

      externalCtrl.abort()
      expect(signal.aborted).toBe(true)
    })
  })

  describe('switchSignal', () => {
    it('GIVEN a switchSignal WHEN switch is called THEN signal$ reflects the new signal', () => {
      const store = createStore()
      const { switch$, signal$ } = switchSignal()

      // signal$ 初始为已 abort 的 signal
      expect(store.get(signal$).aborted).toBe(true)

      const newSignal = store.set(switch$)
      expect(store.get(signal$)).toBe(newSignal)
      expect(newSignal.aborted).toBe(false)
    })

    it('GIVEN a switchSignal called once WHEN switch is called again THEN previous signal is aborted', () => {
      const store = createStore()
      const { switch$, signal$ } = switchSignal()

      const signal1 = store.set(switch$)
      const signal2 = store.set(switch$)

      expect(signal1.aborted).toBe(true)
      expect(signal2.aborted).toBe(false)
      expect(store.get(signal$)).toBe(signal2)
    })
  })
})
