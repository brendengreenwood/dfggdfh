import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataValue } from './DataValue'

describe('DataValue', () => {
  it('renders basis format correctly', () => {
    render(<DataValue value={-0.14} format="basis" />)
    expect(screen.getByTestId('data-value')).toHaveTextContent('14¢ under')
  })

  it('renders basis-short format correctly', () => {
    render(<DataValue value={0.03} format="basis-short" />)
    expect(screen.getByTestId('data-value')).toHaveTextContent('+3.0¢')
  })

  it('renders bushels format correctly', () => {
    render(<DataValue value={480000} format="bushels" />)
    expect(screen.getByTestId('data-value')).toHaveTextContent('480K bu')
  })

  it('renders em dash for null values', () => {
    render(<DataValue value={null} format="raw" />)
    expect(screen.getByTestId('data-value')).toHaveTextContent('—')
  })

  it('renders em dash for null values in basis format', () => {
    render(<DataValue value={null} format="basis" />)
    expect(screen.getByTestId('data-value')).toHaveTextContent('—')
  })

  it('applies text-amber-400 when colorize=true and value > 0.02', () => {
    render(<DataValue value={0.05} colorize />)
    expect(screen.getByTestId('data-value')).toHaveClass('text-amber-400')
  })

  it('applies text-sky-400 when colorize=true and value < -0.02', () => {
    render(<DataValue value={-0.05} colorize />)
    expect(screen.getByTestId('data-value')).toHaveClass('text-sky-400')
  })

  it('applies text-green-400 when colorize=true and value is near zero', () => {
    render(<DataValue value={0.01} colorize />)
    expect(screen.getByTestId('data-value')).toHaveClass('text-green-400')
  })

  it('renders label when provided', () => {
    render(<DataValue value={42} label="Test Label" />)
    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  it('does not render label when not provided', () => {
    const { container } = render(<DataValue value={42} />)
    const labels = container.querySelectorAll('.text-stone-400')
    expect(labels).toHaveLength(0)
  })

  it('uses data-testid="data-value"', () => {
    render(<DataValue value={10} />)
    expect(screen.getByTestId('data-value')).toBeInTheDocument()
  })
})
