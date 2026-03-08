import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CropTag } from './CropTag'

describe('CropTag', () => {
  it('renders "Corn" for CORN', () => {
    render(<CropTag crop="CORN" />)
    expect(screen.getByTestId('crop-tag')).toHaveTextContent('Corn')
  })

  it('renders "Soybeans" for SOYBEANS', () => {
    render(<CropTag crop="SOYBEANS" />)
    expect(screen.getByTestId('crop-tag')).toHaveTextContent('Soybeans')
  })

  it('renders "Wheat" for WHEAT', () => {
    render(<CropTag crop="WHEAT" />)
    expect(screen.getByTestId('crop-tag')).toHaveTextContent('Wheat')
  })

  it('renders "Sorghum" for SORGHUM', () => {
    render(<CropTag crop="SORGHUM" />)
    expect(screen.getByTestId('crop-tag')).toHaveTextContent('Sorghum')
  })

  it('renders "Oats" for OATS', () => {
    render(<CropTag crop="OATS" />)
    expect(screen.getByTestId('crop-tag')).toHaveTextContent('Oats')
  })

  it('uses data-testid="crop-tag"', () => {
    render(<CropTag crop="CORN" />)
    expect(screen.getByTestId('crop-tag')).toBeInTheDocument()
  })
})
