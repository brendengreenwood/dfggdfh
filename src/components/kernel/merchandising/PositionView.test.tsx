import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import { PositionView } from './PositionView'

describe('PositionView (integration)', () => {
  it('renders the position view container', async () => {
    renderWithProviders(<PositionView />)
    expect(await screen.findByTestId('position-view')).toBeInTheDocument()
  })

  it('shows the position table', async () => {
    renderWithProviders(<PositionView />)
    expect(await screen.findByTestId('position-table')).toBeInTheDocument()
  })

  it('shows expandable position rows that reveal detail', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PositionView />)
    const rows = await screen.findAllByTestId('position-row')
    expect(rows.length).toBeGreaterThan(1)
    // Click first row to expand
    await user.click(rows[0])
    expect(screen.getAllByTestId('position-card')).toHaveLength(1)
  })

  it('shows the position summary', async () => {
    renderWithProviders(<PositionView />)
    expect(await screen.findByTestId('position-summary')).toBeInTheDocument()
  })

  it('shows the correct default user name "Marcus Webb"', async () => {
    renderWithProviders(<PositionView />)
    expect(await screen.findByText(/Marcus Webb/)).toBeInTheDocument()
  })

  it('shows strategy launch buttons in expanded detail', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PositionView />)
    const rows = await screen.findAllByTestId('position-row')
    await user.click(rows[0])
    const strategyButtons = screen.getAllByTestId('strategy-launch')
    expect(strategyButtons.length).toBeGreaterThan(0)
  })

  it('shows strategy buttons in the table rows', async () => {
    renderWithProviders(<PositionView />)
    await waitFor(() => {
      const tableButtons = screen.getAllByTitle('View Landscape')
      expect(tableButtons.length).toBeGreaterThan(0)
    })
  })

  it('filters positions when crop button clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PositionView />)

    const rows = await screen.findAllByTestId('position-row')
    const initialRows = rows.length

    const cornButton = screen.getByRole('button', { name: 'Corn' })
    await user.click(cornButton)

    await waitFor(() => {
      const filteredRows = screen.getAllByTestId('position-row').length
      expect(filteredRows).toBeLessThan(initialRows)
    })
  })
})
