import { describe, expect, it } from 'vitest'
import { readInputFromUrl, writeInputToUrl } from '../src/lib/url-state'

describe('shareable URL state', () => {
  it('round trips estimator inputs', () => {
    const input = {
      color: 'White',
      tier: 'pro' as const,
      storageVariant: '512gb' as const,
      orderPrefix: '2500',
      country: 'Brazil',
      shippingMethod: 'standard' as const
    }
    const shareUrl = writeInputToUrl(input)
    expect(shareUrl).toMatch(/^\?s=[A-Za-z0-9_-]{8}$/)
    expect(readInputFromUrl(shareUrl)).toEqual(input)
  })

  it('round trips countries from the complete AYN destination list', () => {
    const input = {
      color: 'Black',
      tier: 'max' as const,
      storageVariant: '1tb' as const,
      orderPrefix: '2500',
      country: 'Zimbabwe',
      shippingMethod: 'dhl' as const
    }
    expect(readInputFromUrl(writeInputToUrl(input))).toEqual(input)
  })

  it('rejects a damaged compact share code', () => {
    expect(readInputFromUrl('?s=AAAAAAAA')).toEqual({})
  })

  it('ignores crafted values outside the guided inputs', () => {
    expect(
      readInputFromUrl(
        '?tier=unknown&storageVariant=standard&orderPrefix=250&country=Unknown&shippingMethod=express'
      )
    ).toEqual({})
  })
})
