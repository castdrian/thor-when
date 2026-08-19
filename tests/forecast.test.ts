import { describe, expect, it } from 'vitest'
import { estimateShipment } from '../src/lib/forecast'
import type { ShipmentDataset } from '../src/lib/types'

const source: ShipmentDataset = {
  schemaVersion: 1,
  fetchedAt: '2026-08-19T00:00:00.000Z',
  sourceUrl: 'https://www.ayntec.com/pages/shipment-dashboard',
  sourceLatestDate: '2026-08-18',
  configurations: [{ color: 'White', tier: 'pro', storageVariant: 'standard' }],
  records: [
    {
      date: '2026-08-01',
      color: 'White',
      tier: 'pro',
      storageVariant: 'standard',
      lowerPrefix: 2400,
      upperPrefix: 2420,
      sourceLabel: 'first'
    },
    {
      date: '2026-08-05',
      color: 'White',
      tier: 'pro',
      storageVariant: 'standard',
      lowerPrefix: 2421,
      upperPrefix: 2450,
      sourceLabel: 'second'
    },
    {
      date: '2026-08-10',
      color: 'White',
      tier: 'pro',
      storageVariant: 'standard',
      lowerPrefix: 2451,
      upperPrefix: 2480,
      sourceLabel: 'third'
    }
  ]
}

const baseInput = {
  color: 'White',
  tier: 'pro' as const,
  storageVariant: 'standard' as const,
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

  it('rejects configurations absent from source data', () => {
    const result = estimateShipment({ ...baseInput, color: 'Black', orderPrefix: '2500' }, source)
    expect(result).toEqual({
      ok: false,
      code: 'unknown-configuration',
      message: 'that Thor configuration is not in the latest shipment data.'
    })
  })
})
