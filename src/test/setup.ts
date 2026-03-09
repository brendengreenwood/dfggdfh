import '@testing-library/jest-dom/vitest'
import { vi, beforeAll, afterAll } from 'vitest'
import { users, elevators, farmers, positionSummaries, mlRecommendations, leads, alerts } from '@/data/mock'

// Mock fetch to return mock data for API calls during tests
const mockFetch = vi.fn((url: string | URL | Request) => {
  const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
  const path = urlStr.replace(/^https?:\/\/[^/]+/, '')

  if (path === '/api/users') {
    return Promise.resolve(new Response(JSON.stringify(users)))
  }

  if (path.startsWith('/api/positions')) {
    const params = new URLSearchParams(path.split('?')[1])
    const userId = params.get('userId')
    const filtered = positionSummaries.filter(p => p.user_id === userId)
    return Promise.resolve(new Response(JSON.stringify(filtered)))
  }

  if (path.startsWith('/api/recommendations')) {
    const params = new URLSearchParams(path.split('?')[1])
    const userId = params.get('userId')
    const filtered = mlRecommendations.filter(r => r.user_id === userId)
    return Promise.resolve(new Response(JSON.stringify(filtered)))
  }

  // PATCH endpoints (must match before GET startsWith checks)
  if (path.includes('/outcome') || path.includes('/read') || path.includes('/dismiss')) {
    return Promise.resolve(new Response(JSON.stringify({ ok: true })))
  }

  if (path.startsWith('/api/leads')) {
    const params = new URLSearchParams(path.split('?')[1])
    const userId = params.get('userId')
    const filtered = leads.filter(l => l.assigned_to === userId)
    return Promise.resolve(new Response(JSON.stringify(filtered)))
  }

  if (path.startsWith('/api/alerts')) {
    const params = new URLSearchParams(path.split('?')[1])
    const userId = params.get('userId')
    const filtered = alerts.filter(a => a.user_id === userId)
    return Promise.resolve(new Response(JSON.stringify(filtered)))
  }

  if (path === '/api/elevators') {
    return Promise.resolve(new Response(JSON.stringify(elevators)))
  }

  // /api/farmers/:id (must match before /api/farmers)
  const farmerMatch = path.match(/^\/api\/farmers\/([^/?]+)$/)
  if (farmerMatch) {
    const farmer = farmers.find(f => f.id === farmerMatch[1])
    if (farmer) {
      return Promise.resolve(new Response(JSON.stringify(farmer)))
    }
    return Promise.resolve(new Response(JSON.stringify({ error: 'Farmer not found' }), { status: 404 }))
  }

  if (path === '/api/farmers') {
    return Promise.resolve(new Response(JSON.stringify(farmers)))
  }

  return Promise.resolve(new Response(JSON.stringify([]), { status: 404 }))
})

beforeAll(() => {
  vi.stubGlobal('fetch', mockFetch)
})

afterAll(() => {
  vi.restoreAllMocks()
})
