import { describe, expect, it } from 'vitest'
import { estimateShipment } from '../src/lib/forecast'
import type { ShipmentDataset } from '../src/lib/types'

const source: ShipmentDataset = {
  schemaVersion: 2,
  fetchedAt: '2026-08-19T00:00:00.000Z',
  sourceUrl: 'https://www.ayntec.com/pages/shipment-dashboard',
  sourceLatestDate: '2026-08-18',
  configurations: [{ color: 'White', tier: 'pro', storageVariant: '256gb' }],
  records: [
    {
      date: '2026-08-01',
      color: 'White',
      tier: 'pro',
      storageVariant: '256gb',
      lowerPrefix: 2400,
      upperPrefix: 2420,
      sourceLabel: 'first'
    },
    {
      date: '2026-08-05',
      color: 'White',
      tier: 'pro',
      storageVariant: '256gb',
      lowerPrefix: 2421,
      upperPrefix: 2450,
      sourceLabel: 'second'
    },
    {
      date: '2026-08-10',
      color: 'White',
      tier: 'pro',
      storageVariant: '256gb',
      lowerPrefix: 2451,
      upperPrefix: 2480,
      sourceLabel: 'third'
    }
  ]
}

const baseInput = {
  color: 'White',
  tier: 'pro' as const,
  storageVariant: '256gb' as const,
  country: 'United States',
  shippingMethod: 'dhl' as const
}

describe('shipment estimates', () => {
  it('reports an explicitly published batch as observed', () => {
    const result = estimateShipment({ ...baseInput, orderPrefix: '2430' }, source)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.dispatch.status).toBe('observed')
      expect(result.dispatch.likelyDate).toBe('2026-08-05')
      expect(result.dispatch.confidence).toBe('high')
    }
  })

  it('reports a future bucket with a window and separate arrival estimate', () => {
    const result = estimateShipment({ ...baseInput, orderPrefix: '2520' }, source)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(['forecast', 'insufficient']).toContain(result.dispatch.status)
      expect(result.dispatch.likelyDate >= source.sourceLatestDate).toBe(true)
      expect(result.dispatch.window.end >= result.dispatch.window.start).toBe(true)
      expect(result.arrival.window.start > result.dispatch.window.start).toBe(true)
    }
  })

  it('rejects non-four-digit order signals', () => {
    expect(estimateShipment({ ...baseInput, orderPrefix: '25' }, source)).toEqual({
      ok: false,
      code: 'invalid-prefix',
      message: 'enter the four digits before the xx in your order number.'
    })
  })

  it('rejects unsupported route values', () => {
    expect(
      estimateShipment(
        { ...baseInput, orderPrefix: '2500', country: 'Mars', shippingMethod: 'dhl' },
        source
      )
    ).toEqual({
      ok: false,
      code: 'invalid-route',
      message: 'choose a supported destination and shipping method.'
    })
  })

  it('uses a pooled forecast for a valid configuration with no direct rows', () => {
    const result = estimateShipment({ ...baseInput, color: 'Black', orderPrefix: '2500' }, source)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.dispatch.status).toBe('insufficient')
      expect(result.dispatch.model).toMatch(/^pooled/)
      expect(result.dispatch.likelyDate >= source.sourceLatestDate).toBe(true)
    }
  })

  it('reports unavailable data separately from an unknown configuration', () => {
    const unavailable: ShipmentDataset = {
      ...source,
      records: [],
      configurations: []
    }
    expect(estimateShipment({ ...baseInput, orderPrefix: '2500' }, unavailable)).toEqual({
      ok: false,
      code: 'no-data',
      message: 'AYN shipment data is unavailable right now. Try again after the next refresh.'
    })
  })

  it('widens an observed result when a bucket appears on adjacent source dates', () => {
    const boundarySource: ShipmentDataset = {
      ...source,
      sourceLatestDate: '2026-08-12',
      records: [
        {
          ...source.records[0],
          date: '2026-08-01',
          lowerPrefix: 2400,
          upperPrefix: 2430
        },
        {
          ...source.records[1],
          date: '2026-08-05',
          lowerPrefix: 2430,
          upperPrefix: 2460
        },
        {
          ...source.records[2],
          date: '2026-08-10',
          lowerPrefix: 2461,
          upperPrefix: 2480
        }
      ]
    }
    const result = estimateShipment({ ...baseInput, orderPrefix: '2430' }, boundarySource)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.dispatch.confidence).toBe('medium')
      expect(result.dispatch.window).toEqual({ start: '2026-08-01', end: '2026-08-05' })
    }
  })
})
