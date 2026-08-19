import { describe, expect, it } from 'vitest'
import { dataset } from '../src/lib/data'
import { calculateInsights } from '../src/lib/insights'

describe('insight metrics', () => {
  it('compares accepted reports with a baseline model snapshot', () => {
    const metrics = calculateInsights({
      ...dataset,
      communityReports: [
        {
          id: 'report-1',
          submittedAt: '2026-08-19T12:00:00.000Z',
          color: 'White',
          tier: 'max',
          storageVariant: '512gb',
          orderPrefix: 2234,
          country: 'South Korea',
          shippingMethod: 'standard',
          dispatchedOn: '2026-07-03',
          deliveredOn: '2026-07-20'
        }
      ]
    })
    expect(metrics.totalSubmissions).toBe(1)
    expect(metrics.deliveredSubmissions).toBe(1)
    expect(metrics.validEstimates).toBe(1)
    expect(metrics.dispatchWithinWindow).toBe(1)
    expect(metrics.medianDispatchMissDays).toBe(0)
    expect(metrics.arrivalWithinWindow).toBe(1)
    expect(metrics.medianArrivalMissDays).toBe(0)
    expect(metrics.confidence.high).toBe(1)
  })
})
