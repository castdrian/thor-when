import { describe, expect, it } from 'vitest'
import { parseCommunityReportInput } from '../src/lib/report'

const report = {
  color: 'Black',
  tier: 'max',
  storageVariant: '1tb',
  orderPrefix: '2500',
  country: 'South Korea',
  shippingMethod: 'standard',
  dispatchedOn: '2026-08-10',
  deliveredOn: '2026-08-25'
}

describe('community report validation', () => {
  it('normalizes a complete report without personal fields', () => {
    expect(parseCommunityReportInput(report, new Date('2026-08-30T00:00:00Z'))).toEqual({
      color: 'Black',
      tier: 'max',
      storageVariant: '1tb',
      orderPrefix: 2500,
      country: 'South Korea',
      shippingMethod: 'standard',
      dispatchedOn: '2026-08-10',
      deliveredOn: '2026-08-25'
    })
  })

  it('accepts trusted community data without an approval step', () => {
    expect(parseCommunityReportInput(report, new Date('2026-08-30T00:00:00Z'))).not.toBeNull()
  })

  it('rejects invalid variants, dates, and order prefixes', () => {
    expect(parseCommunityReportInput({ ...report, storageVariant: '64gb' })).toBeNull()
    expect(parseCommunityReportInput({ ...report, orderPrefix: '250' })).toBeNull()
    expect(
      parseCommunityReportInput({ ...report, dispatchedOn: '2026-09-01' }, new Date('2026-08-30'))
    ).toBeNull()
    expect(parseCommunityReportInput({ ...report, deliveredOn: '2026-08-01' })).toBeNull()
  })
})
