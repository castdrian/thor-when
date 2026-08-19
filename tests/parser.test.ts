import { describe, expect, it } from 'vitest'
import { parseConfiguration, parseDashboardHtml } from '../scripts/fetch-dashboard'

describe('dashboard parser', () => {
  it('normalizes full-width 512 labels and keeps storage variants distinct', () => {
    expect(parseConfiguration('White Max（512）')).toEqual({
      color: 'White',
      tier: 'max',
      storageVariant: '512gb'
    })
    expect(parseConfiguration('White Max')).toEqual({
      color: 'White',
      tier: 'max',
      storageVariant: '1tb'
    })
    expect(parseConfiguration('White Max 512')).toEqual({
      color: 'White',
      tier: 'max',
      storageVariant: '512gb'
    })
    expect(parseConfiguration('White Max 1TB')).toEqual({
      color: 'White',
      tier: 'max',
      storageVariant: '1tb'
    })
    expect(parseConfiguration('Black Pro')).toEqual({
      color: 'Black',
      tier: 'pro',
      storageVariant: '256gb'
    })
    expect(parseConfiguration('Black Lite')).toEqual({
      color: 'Black',
      tier: 'lite',
      storageVariant: '128gb'
    })
  })

  it('extracts dated shipment ranges and configurations', () => {
    const html = `<main><p>2026/8/18</p><p>AYN Thor White Max（512）: 2500xx--2550xx</p><p>AYN Thor Black Pro: 2400xx--2410xx</p><p>AYN Thor Black Base: 2200xx--2300xx</p><p>AYN Thor White Max（512）: 2551xx--2560xx</p><p>AYN Thor Black Pro: 2411xx--2420xx</p><p>AYN Thor Black Base: 2301xx--2310xx</p><p>2026/8/19</p><p>AYN Thor White Max（512）: 2561xx–2600xx</p><p>AYN Thor Black Pro: 2421xx--2430xx</p><p>AYN Thor Black Base: 2311xx--2320xx</p><p>AYN Thor White Max（512）: 2601xx--2620xx</p></main>`
    const data = parseDashboardHtml(html, '2026-08-19T12:00:00.000Z')
    expect(data.sourceLatestDate).toBe('2026-08-19')
    expect(data.records).toHaveLength(10)
    expect(data.records[0].storageVariant).toBe('512gb')
    expect(data.configurations).toContainEqual({
      color: 'Black',
      tier: 'pro',
      storageVariant: '256gb'
    })
    expect(data.configurations).toHaveLength(20)
  })

  it('fails when the source has no recognized rows', () => {
    expect(() => parseDashboardHtml('<main><p>nothing useful</p></main>')).toThrow(
      /enough recognized/
    )
  })

  it('fails on rollover calendar dates and malformed Thor rows', () => {
    const invalidDate = '<main><p>2026/2/31</p></main>'
    expect(() => parseDashboardHtml(invalidDate)).toThrow(/invalid date/)
    const malformed = '<main><p>2026/8/19</p><p>AYN Thor White Ultra: 2500xx--2550xx</p></main>'
    expect(() => parseDashboardHtml(malformed)).toThrow(/unknown Thor configuration/)
  })
})
