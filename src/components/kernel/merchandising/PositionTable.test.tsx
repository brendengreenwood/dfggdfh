import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import { PositionTable } from './PositionTable'
import { positionSummaries, mlRecommendations } from '@/data/mock'
import type { PositionSummary, MLRecommendation } from '@/types/kernel'

const testPositions = positionSummaries.filter(
  ps => ps.user_id === 'a1000000-0000-0000-0000-000000000001'
)

const getRecommendation = (position: PositionSummary): MLRecommendation | undefined => {
  return mlRecommendations.find(
    r =>
      r.elevator_id === position.elevator_id &&
      r.crop === position.crop &&
      r.delivery_month === position.delivery_month
  )
}

describe('PositionTable', () => {
  it('renders the table', () => {
    renderWithProviders(<PositionTable positions={testPositions} getRecommendation={getRecommendation} />)
    expect(screen.getByTestId('position-table')).toBeInTheDocument()
  })

  it('renders column headers', () => {
    renderWithProviders(<PositionTable positions={testPositions} getRecommendation={getRecommendation} />)
    expect(screen.getByText('Elevator')).toBeInTheDocument()
    expect(screen.getByText('Crop')).toBeInTheDocument()
    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('Net')).toBeInTheDocument()
    expect(screen.getByText('Coverage')).toBeInTheDocument()
    expect(screen.getByText('Basis')).toBeInTheDocument()
    expect(screen.getByText('ML Rec')).toBeInTheDocument()
    expect(screen.getByText('Delta')).toBeInTheDocument()
  })

  it('renders a row for each position', () => {
    renderWithProviders(<PositionTable positions={testPositions} getRecommendation={getRecommendation} />)
    const rows = screen.getAllByTestId('position-row')
    expect(rows.length).toBe(testPositions.length)
  })

  it('shows elevator names', () => {
    renderWithProviders(<PositionTable positions={testPositions} getRecommendation={getRecommendation} />)
    expect(screen.getAllByText('Ames Main').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Nevada Terminal').length).toBeGreaterThanOrEqual(1)
  })

  it('renders strategy buttons for each row', () => {
    renderWithProviders(<PositionTable positions={testPositions} getRecommendation={getRecommendation} />)
    const buttons = screen.getAllByTitle('View Landscape')
    expect(buttons.length).toBe(testPositions.length)
  })

  it('expands a row when clicked to show detail', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PositionTable positions={testPositions} getRecommendation={getRecommendation} />)
    // No detail rows initially
    expect(screen.queryAllByTestId('position-card')).toHaveLength(0)
    // Click first row
    const rows = screen.getAllByTestId('position-row')
    await user.click(rows[0])
    // Detail row should appear
    expect(screen.getAllByTestId('position-card')).toHaveLength(1)
  })

  it('collapses an expanded row when clicked again', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PositionTable positions={testPositions} getRecommendation={getRecommendation} />)
    const rows = screen.getAllByTestId('position-row')
    await user.click(rows[0])
    expect(screen.getAllByTestId('position-card')).toHaveLength(1)
    await user.click(rows[0])
    expect(screen.queryAllByTestId('position-card')).toHaveLength(0)
  })
})
