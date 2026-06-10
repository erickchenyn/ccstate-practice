import '@testing-library/jest-dom/vitest'
import { clearAllDetached } from './utils/detach'

afterEach(() => {
  vi.restoreAllMocks()
  return clearAllDetached()
})
