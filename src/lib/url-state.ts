import type { EstimateInput, ShippingMethod, StorageVariant, ThorTier } from './types'
import { SUPPORTED_COUNTRIES } from './transit'

export { SUPPORTED_COUNTRIES } from './transit'

const keys = [
  'color',
  'tier',
  'storageVariant',
  'orderPrefix',
  'country',
  'shippingMethod'
] as const

const tiers = new Set<ThorTier>(['lite', 'base', 'pro', 'max'])
const storageVariants = new Set<StorageVariant>(['standard', '512'])
const shippingMethods = new Set<ShippingMethod>(['dhl', 'standard'])
const countries = new Set<string>(SUPPORTED_COUNTRIES)

function isThorTier(value: string): value is ThorTier {
  return tiers.has(value as ThorTier)
}

function isStorageVariant(value: string): value is StorageVariant {
  return storageVariants.has(value as StorageVariant)
}

function isShippingMethod(value: string): value is ShippingMethod {
  return shippingMethods.has(value as ShippingMethod)
}

export function readInputFromUrl(search: string): Partial<EstimateInput> {
  const params = new URLSearchParams(search)
  const values: Partial<EstimateInput> = {}
  const color = params.get('color')
  if (color) values.color = color
  const tier = params.get('tier')
  if (tier && isThorTier(tier)) values.tier = tier
  const storageVariant = params.get('storageVariant')
  if (storageVariant && isStorageVariant(storageVariant)) values.storageVariant = storageVariant
  const orderPrefix = params.get('orderPrefix')
  if (orderPrefix && /^\d{4}$/.test(orderPrefix)) values.orderPrefix = orderPrefix
  const country = params.get('country')
  if (country && countries.has(country)) values.country = country
  const shippingMethod = params.get('shippingMethod')
  if (shippingMethod && isShippingMethod(shippingMethod)) values.shippingMethod = shippingMethod
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
