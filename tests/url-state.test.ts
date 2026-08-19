import { describe, expect, it } from 'vitest'
import { readInputFromUrl, writeInputToUrl } from '../src/lib/url-state'

describe('shareable URL state', () => {
  it('round trips estimator inputs', () => {
    const input = {
      color: 'White',
      tier: 'pro' as const,
      storageVariant: '512' as const,
      orderPrefix: '2500',
      country: 'Brazil',
      shippingMethod: 'standard' as const
    }
    expect(readInputFromUrl(writeInputToUrl(input))).toEqual(input)
  })

  it('ignores crafted values outside the guided inputs', () => {
    expect(
      readInputFromUrl(
        '?tier=unknown&storageVariant=1tb&orderPrefix=250&country=Unknown&shippingMethod=express'
      )
    ).toEqual({})
  })
})
