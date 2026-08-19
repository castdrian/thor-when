import { describe, expect, it } from 'vitest'
import { dataset } from '../src/lib/data'
import { estimateShipment } from '../src/lib/forecast'
import { buildOgImage } from '../src/lib/og-image'

describe('dynamic og image', () => {
  it('renders the result card data into a dark svg source image', () => {
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
    const image = buildOgImage(result)
    expect(image).toContain('<svg')
    expect(image).toContain('MOST LIKELY DISPATCH')
    expect(image).toContain('ESTIMATED ARRIVAL')
    expect(image).toContain('2500')
    expect(image).toContain('#03070d')
  })
})
