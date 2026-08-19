import { describe, expect, it } from 'vitest'
import { getConfigurations, getStorageVariants, getTiers, isDatasetStale } from '../src/lib/data'
import type { ShipmentDataset } from '../src/lib/types'

const dataset: ShipmentDataset = {
  schemaVersion: 2,
  fetchedAt: '2026-08-19T00:00:00.000Z',
  sourceUrl: 'https://www.ayntec.com/pages/shipment-dashboard',
  sourceLatestDate: '2026-08-18',
  configurations: [{ color: 'White', tier: 'pro', storageVariant: '256gb' }],
  records: []
}

describe('shipment data health', () => {
  it('marks a source stale after the display threshold', () => {
    expect(isDatasetStale(dataset, new Date('2026-08-19T00:00:00.000Z'))).toBe(false)
    expect(isDatasetStale(dataset, new Date('2026-09-02T00:00:00.000Z'))).toBe(true)
  })

  it('keeps the full Thor catalog in product order', () => {
    expect(getTiers(dataset)).toEqual(['max', 'pro', 'base', 'lite'])
    expect(getStorageVariants('max', dataset)).toEqual(['1tb', '512gb'])
    expect(getConfigurations(dataset)).toHaveLength(20)
  })
})
