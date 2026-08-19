import {
  THOR_COLORS,
  THOR_VARIANTS,
  type CommunityReport,
  type ShippingMethod,
  type StorageVariant,
  type ThorTier
} from './types'
import { SUPPORTED_COUNTRIES } from './transit'

export interface CommunityReportInput {
  color: string
  tier: string
  storageVariant: string
  orderPrefix: string | number
  country: string
  shippingMethod: string
  dispatchedOn: string
  deliveredOn?: string | null
}

type ValidatedReport = Omit<CommunityReport, 'id' | 'submittedAt'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseDate(value: unknown, now: Date): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return null
  if (date.getTime() > now.getTime()) return null
  return value
}

function isColor(value: string): boolean {
  return THOR_COLORS.includes(value as (typeof THOR_COLORS)[number])
}

function isTier(value: string): value is ThorTier {
  return THOR_VARIANTS.some((variant) => variant.tier === value)
}

function isStorageVariant(value: string): value is StorageVariant {
  return THOR_VARIANTS.some((variant) => variant.storageVariant === value)
}

function isShippingMethod(value: string): value is ShippingMethod {
  return value === 'dhl' || value === 'standard'
}

export function parseCommunityReportInput(
  value: unknown,
  now = new Date()
): ValidatedReport | null {
  if (!isRecord(value)) return null
  const color = typeof value.color === 'string' ? value.color : ''
  const tier = typeof value.tier === 'string' ? value.tier : ''
  const storageVariant = typeof value.storageVariant === 'string' ? value.storageVariant : ''
  const country = typeof value.country === 'string' ? value.country : ''
  const shippingMethod = typeof value.shippingMethod === 'string' ? value.shippingMethod : ''
  const orderPrefix = String(value.orderPrefix ?? '')
  const dispatchedOn = parseDate(value.dispatchedOn, now)
  const deliveredRaw = value.deliveredOn
  const deliveredOn =
    deliveredRaw === undefined || deliveredRaw === null || deliveredRaw === ''
      ? undefined
      : parseDate(deliveredRaw, now)
  const variantExists = THOR_VARIANTS.some(
    (variant) => variant.tier === tier && variant.storageVariant === storageVariant
  )
  if (
    !isColor(color) ||
    !isTier(tier) ||
    !isStorageVariant(storageVariant) ||
    !variantExists ||
    !SUPPORTED_COUNTRIES.includes(country as (typeof SUPPORTED_COUNTRIES)[number]) ||
    !isShippingMethod(shippingMethod) ||
    !/^\d{4}$/.test(orderPrefix) ||
    !dispatchedOn ||
    (deliveredRaw !== undefined && deliveredRaw !== null && deliveredRaw !== '' && !deliveredOn)
  )
    return null
  if (deliveredOn && deliveredOn < dispatchedOn) return null
  return {
    color,
    tier,
    storageVariant,
    orderPrefix: Number(orderPrefix),
    country,
    shippingMethod,
    dispatchedOn,
    ...(deliveredOn ? { deliveredOn } : {})
  }
}
