import '@testing-library/jest-dom'
import '@testing-library/jest-dom/vitest'
import { clearAllDetached } from '../detach-promise'

afterEach(() => {
    vi.restoreAllMocks()
    return clearAllDetached()
})
