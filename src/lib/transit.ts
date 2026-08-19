import type { ArrivalEstimate, DateWindow, ShippingMethod } from './types'

const BRAZIL = 'Brazil'

export function transitRange(
  country: string,
  method: ShippingMethod
): { min: number; max: number; label: string } {
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

export function addWorkingDaysToWindow(
  window: DateWindow,
  country: string,
  method: ShippingMethod
): ArrivalEstimate {
  const range = transitRange(country, method)
  return {
    window: {
      start: addWorkingDays(window.start, range.min),
      end: addWorkingDays(window.end, range.max)
    },
    transitDays: { min: range.min, max: range.max },
    methodLabel: range.label,
    explanation:
      method === 'dhl'
        ? 'AYN lists DHL at about 3–7 working days after dispatch.'
        : country === BRAZIL
          ? 'AYN lists Standard / 4PX at about 15–30 days for Brazil after dispatch.'
          : 'AYN lists Standard / 4PX at about 15–20 days after dispatch.'
  }
}
