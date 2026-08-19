export type ThorTier = 'max' | 'pro' | 'base' | 'lite'
export type StorageVariant = '128gb' | '256gb' | '512gb' | '1tb'
export type ShippingMethod = 'dhl' | 'standard'
export type Confidence = 'high' | 'medium' | 'low'

export interface ThorVariant {
  tier: ThorTier
  storageVariant: StorageVariant
  memoryGb: 8 | 12 | 16
  label: string
}

export interface CommunityReport {
  id: string
  submittedAt: string
  color: string
  tier: ThorTier
  storageVariant: StorageVariant
  orderPrefix: number
  country: string
  shippingMethod: ShippingMethod
  dispatchedOn: string
  deliveredOn?: string
}

export const THOR_COLORS = ['Black', 'White', 'Rainbow', 'Clear Purple'] as const

export const THOR_VARIANTS: readonly ThorVariant[] = [
  { tier: 'max', storageVariant: '1tb', memoryGb: 16, label: 'Max · 16+1TB' },
  { tier: 'max', storageVariant: '512gb', memoryGb: 16, label: 'Max · 16+512GB' },
  { tier: 'pro', storageVariant: '256gb', memoryGb: 12, label: 'Pro · 12+256GB' },
  { tier: 'base', storageVariant: '128gb', memoryGb: 8, label: 'Base · 8+128GB' },
  { tier: 'lite', storageVariant: '128gb', memoryGb: 8, label: 'Lite · 8+128GB' }
]

export const THOR_TIER_ORDER: readonly ThorTier[] = ['max', 'pro', 'base', 'lite']

export interface ShipmentRecord {
  date: string
  color: string
  tier: ThorTier
  storageVariant: StorageVariant
  lowerPrefix: number
  upperPrefix: number
  sourceLabel: string
}

export interface ThorConfiguration {
  color: string
  tier: ThorTier
  storageVariant: StorageVariant
}

export interface ShipmentDataset {
  schemaVersion: 2
  fetchedAt: string
  sourceUrl: string
  sourceLatestDate: string
  records: ShipmentRecord[]
  configurations: ThorConfiguration[]
  communityReports?: CommunityReport[]
}

export interface EstimateInput extends ThorConfiguration {
  orderPrefix: string | number
  country: string
  shippingMethod: ShippingMethod
  asOf?: string
}

export type EstimateStatus = 'observed' | 'inferred' | 'forecast' | 'insufficient'

export interface DateWindow {
  start: string
  end: string
}

export interface DispatchEstimate {
  status: EstimateStatus
  likelyDate: string
  window: DateWindow
  confidence: Confidence
  frontierPrefix: number
  observations: number
  model: string
  explanation: string
}

export interface ArrivalEstimate {
  window: DateWindow
  transitDays: { min: number; max: number }
  methodLabel: string
  explanation: string
  sourceUrl: string
  sampleSize: number
}

export interface EstimateSuccess {
  ok: true
  input: EstimateInput & { orderPrefix: number }
  dispatch: DispatchEstimate
  arrival: ArrivalEstimate
  dataset: Pick<ShipmentDataset, 'fetchedAt' | 'sourceUrl' | 'sourceLatestDate'>
}

export interface EstimateFailure {
  ok: false
  code: 'invalid-prefix' | 'invalid-route' | 'unknown-configuration' | 'no-data'
  message: string
}

export type EstimateResult = EstimateSuccess | EstimateFailure
