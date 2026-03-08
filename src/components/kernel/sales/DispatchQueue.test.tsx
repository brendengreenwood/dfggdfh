import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import { DispatchQueue } from './DispatchQueue'

describe('DispatchQueue (integration)', () => {
  it('renders the dispatch queue container', () => {
    renderWithProviders(<DispatchQueue />)
    expect(screen.getByTestId('dispatch-queue')).toBeInTheDocument()
  })

  it('shows the queue header with "Dispatch Queue" text', () => {
    renderWithProviders(<DispatchQueue />)
    expect(screen.getByText('Dispatch Queue')).toBeInTheDocument()
  })

  it('shows Pending and All filter buttons', () => {
    renderWithProviders(<DispatchQueue />)
    expect(screen.getByText(/Pending/)).toBeInTheDocument()
    expect(screen.getByText(/All/)).toBeInTheDocument()
  })
})
