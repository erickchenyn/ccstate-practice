import '@testing-library/jest-dom/vitest'
import { clearAllDetached } from './common/detach'

afterEach(() => {
  vi.restoreAllMocks()
  return clearAllDetached()
})
