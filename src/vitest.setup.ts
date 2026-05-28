import '@testing-library/jest-dom/vitest'
import { clearAllDetached } from './tools/utils/detach'

afterEach(() => {
  vi.restoreAllMocks()
  return clearAllDetached()
})
