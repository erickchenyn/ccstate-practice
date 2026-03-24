import '@testing-library/jest-dom/vitest'
import { clearAllDetached } from './signals/utils/detach'

afterEach(() => {
  vi.restoreAllMocks()
  return clearAllDetached()
})
