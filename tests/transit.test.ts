import { describe, expect, it } from 'vitest'
import {
  addCalendarDays,
  addWorkingDays,
  addWorkingDaysToWindow,
  isSupportedCountry,
  isSupportedShippingMethod,
  transitRange
} from '../src/lib/transit'

describe('transit estimates', () => {
  it('uses the DHL range from AYN', () => {
    expect(transitRange('United States', 'dhl')).toEqual({ min: 3, max: 7, label: 'DHL' })
  })

  it('uses the extended Standard range for Brazil', () => {
    expect(transitRange('Brazil', 'standard')).toEqual({
      min: 15,
      max: 30,
      label: 'Standard / 4PX'
    })
  })

  it('rejects unsupported route values', () => {
    expect(isSupportedCountry('Mars')).toBe(false)
    expect(isSupportedShippingMethod('express')).toBe(false)
    expect(() => transitRange('Mars', 'standard')).toThrow(/destination/)
  })

  it('skips weekends when adding working days', () => {
    expect(addWorkingDays('2026-08-14', 1)).toBe('2026-08-17')
    expect(addWorkingDays('2026-08-17', 3)).toBe('2026-08-20')
  })

  it('keeps calendar-day Standard transit on weekends when the range crosses one', () => {
    expect(addCalendarDays('2026-08-14', 15)).toBe('2026-08-29')
    expect(
      addWorkingDaysToWindow(
        { start: '2026-08-14', end: '2026-08-14' },
        'United States',
        'standard'
      ).window
    ).toEqual({ start: '2026-08-29', end: '2026-09-03' })
  })

  it('adds transit to both ends of a dispatch window', () => {
    expect(
      addWorkingDaysToWindow({ start: '2026-08-17', end: '2026-08-18' }, 'United States', 'dhl')
        .window
    ).toEqual({
      start: '2026-08-20',
      end: '2026-08-27'
    })
  })
})
