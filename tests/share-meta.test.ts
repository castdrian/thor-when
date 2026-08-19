import { describe, expect, it } from 'vitest'
import { dataset } from '../src/lib/data'
import { estimateShipment } from '../src/lib/forecast'
import { buildShareMetadata } from '../src/lib/share-meta'

describe('share metadata', () => {
  it('summarizes a shared estimate in social metadata', () => {
    const result = estimateShipment(
      {
        color: 'Black',
        tier: 'max',
        storageVariant: '1tb',
        orderPrefix: '2500',
        country: 'South Korea',
        shippingMethod: 'standard'
      },
      dataset
    )
    if (!result.ok) throw new Error(result.message)
    const metadata = buildShareMetadata(result)
    expect(metadata.title).toContain('thor when?')
    expect(metadata.title).toContain('2500')
    expect(metadata.description).toContain('dispatch')
    expect(metadata.description).toContain('arrival')
  })
})
