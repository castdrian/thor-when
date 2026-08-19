import {
  THOR_COLORS,
  THOR_TIER_ORDER,
  type EstimateInput,
  type ShippingMethod,
  type StorageVariant,
  type ThorTier
} from './types'
import { SUPPORTED_COUNTRIES } from './transit'

const VERSION = 2
const STORAGE_ORDER: readonly StorageVariant[] = ['128gb', '256gb', '512gb', '1tb']
const SHIPPING_ORDER: readonly ShippingMethod[] = ['dhl', 'standard']

function checksum(bytes: Uint8Array): number {
  return bytes.reduce((total, byte, index) => (total + byte * (index + 17)) & 0xff, 29)
}

function toBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]{8}$/.test(value)) return null
  try {
    const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/'))
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

function indexOf<T>(values: readonly T[], value: T): number {
  return values.indexOf(value)
}

export function encodeShareCode(input: EstimateInput): string | null {
  const color = indexOf(THOR_COLORS, input.color as (typeof THOR_COLORS)[number])
  const tier = indexOf(THOR_TIER_ORDER, input.tier)
  const storage = indexOf(STORAGE_ORDER, input.storageVariant)
  const country = indexOf(
    SUPPORTED_COUNTRIES,
    input.country as (typeof SUPPORTED_COUNTRIES)[number]
  )
  const shipping = indexOf(SHIPPING_ORDER, input.shippingMethod)
  const orderPrefix = String(input.orderPrefix)
  const order = Number(orderPrefix)
  if (
    color < 0 ||
    tier < 0 ||
    storage < 0 ||
    country < 0 ||
    shipping < 0 ||
    !/^\d{4}$/.test(orderPrefix) ||
    !Number.isInteger(order) ||
    order < 0 ||
    order > 9999
  )
    return null
  const bytes = new Uint8Array(6)
  bytes[0] = VERSION
  bytes[1] = (color << 5) | (tier << 3) | (storage << 1) | shipping
  bytes[2] = country
  bytes[3] = order >> 8
  bytes[4] = order & 0xff
  bytes[5] = checksum(bytes.subarray(0, 5))
  return toBase64Url(bytes)
}

export function decodeShareCode(value: string): Partial<EstimateInput> {
  const bytes = fromBase64Url(value)
  if (!bytes) return {}
  if (bytes.length !== 6 || bytes[0] !== VERSION || checksum(bytes.subarray(0, 5)) !== bytes[5])
    return {}
  const color = THOR_COLORS[bytes[1] >> 5]
  const tier = THOR_TIER_ORDER[(bytes[1] >> 3) & 0b11] as ThorTier | undefined
  const storageVariant = STORAGE_ORDER[(bytes[1] >> 1) & 0b11]
  const shippingMethod = SHIPPING_ORDER[bytes[1] & 0b1]
  const country = SUPPORTED_COUNTRIES[bytes[2]]
  if (!color || !tier || !storageVariant || !shippingMethod || !country) return {}
  const orderPrefix = String((bytes[3] << 8) | bytes[4]).padStart(4, '0')
  if (Number(orderPrefix) > 9999) return {}
  return { color, tier, storageVariant, orderPrefix, country, shippingMethod }
}
