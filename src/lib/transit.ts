import type { ArrivalEstimate, DateWindow, ShippingMethod } from './types'

const BRAZIL = 'Brazil'

export const SUPPORTED_COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'France',
  'Netherlands',
  'Australia',
  'New Zealand',
  'Japan',
  'South Korea',
  'Singapore',
  'Brazil',
  'Spain',
  'Italy',
  'Sweden',
  'Switzerland',
  'Poland',
  'Ireland',
  'Other'
] as const

export function isSupportedCountry(country: string): boolean {
  return SUPPORTED_COUNTRIES.includes(country as (typeof SUPPORTED_COUNTRIES)[number])
}

export function isSupportedShippingMethod(method: string): method is ShippingMethod {
  return method === 'dhl' || method === 'standard'
}

export function transitRange(
  country: string,
  method: ShippingMethod
): { min: number; max: number; label: string } {
  if (!isSupportedCountry(country)) throw new Error('unsupported destination country')
  if (!isSupportedShippingMethod(method)) throw new Error('unsupported shipping method')
  if (method === 'dhl') return { min: 3, max: 7, label: 'DHL' }
  if (country === BRAZIL) return { min: 15, max: 30, label: 'Standard / 4PX' }
  return { min: 15, max: 20, label: 'Standard / 4PX' }
}

export function addWorkingDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  let remaining = days
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1)
    const weekday = date.getUTCDay()
    if (weekday !== 0 && weekday !== 6) remaining -= 1
  }
  return date.toISOString().slice(0, 10)
}

export function addCalendarDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function addWorkingDaysToWindow(
  window: DateWindow,
  country: string,
  method: ShippingMethod
): ArrivalEstimate {
  const range = transitRange(country, method)
  const addDays = method === 'dhl' ? addWorkingDays : addCalendarDays
  return {
    window: {
      start: addDays(window.start, range.min),
      end: addDays(window.end, range.max)
    },
    transitDays: { min: range.min, max: range.max },
    methodLabel: range.label,
    explanation:
      method === 'dhl'
        ? 'AYN lists DHL at about 3–7 working days after dispatch.'
        : country === BRAZIL
          ? 'AYN lists Standard / 4PX at about 15–30 calendar days for Brazil after dispatch.'
          : 'AYN lists Standard / 4PX at about 15–20 calendar days after dispatch.'
  }
}
