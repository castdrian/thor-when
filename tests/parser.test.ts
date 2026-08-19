import { describe, expect, it } from 'vitest'
import { parseConfiguration, parseDashboardHtml } from '../scripts/fetch-dashboard'

describe('dashboard parser', () => {
  it('normalizes full-width 512 labels and keeps storage variants distinct', () => {
    expect(parseConfiguration('White Max（512）')).toEqual({
      color: 'White',
      tier: 'max',
      storageVariant: '512'
    })
    expect(parseConfiguration('White Max')).toEqual({
      color: 'White',
      tier: 'max',
      storageVariant: 'standard'
    })
  })

  it('extracts dated shipment ranges and configurations', () => {
    const html = `<main><p>2026/8/18</p><p>AYN Thor White Max（512）: 2500xx--2550xx</p><p>AYN Thor Black Pro: 2400xx--2410xx</p><p>2026/8/19</p><p>AYN Thor White Max（512）: 2550xx--2600xx</p></main>`
    const data = parseDashboardHtml(html, '2026-08-19T12:00:00.000Z')
    expect(data.sourceLatestDate).toBe('2026-08-19')
    expect(data.records).toHaveLength(3)
    expect(data.records[0].storageVariant).toBe('512')
    expect(data.configurations).toContainEqual({
      color: 'Black',
      tier: 'pro',
      storageVariant: 'standard'
    })
  })

  it('fails when the source has no recognized rows', () => {
    expect(() => parseDashboardHtml('<main><p>nothing useful</p></main>')).toThrow(
      /enough recognized/
    )
  })
})
