import type { EstimateInput } from './types'

const keys = [
  'color',
  'tier',
  'storageVariant',
  'orderPrefix',
  'country',
  'shippingMethod'
] as const

export function readInputFromUrl(search: string): Partial<EstimateInput> {
  const params = new URLSearchParams(search)
  const values: Partial<EstimateInput> = {}
  for (const key of keys) {
    const value = params.get(key)
    if (value) values[key] = value as never
  }
  return values
}

export function writeInputToUrl(input: EstimateInput): string {
  const params = new URLSearchParams()
  for (const key of keys) {
    const value = input[key]
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return `?${params.toString()}`
}
