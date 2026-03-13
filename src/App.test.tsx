import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('GIVEN App rendered WHEN page loads THEN shows Hello', () => {
    render(<App />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
