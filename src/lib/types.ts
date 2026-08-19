export type ThorTier = 'lite' | 'base' | 'pro' | 'max'
export type StorageVariant = 'standard' | '512'
export type ShippingMethod = 'dhl' | 'standard'
export type Confidence = 'high' | 'medium' | 'low'

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
  schemaVersion: 1
  fetchedAt: string
  sourceUrl: string
  sourceLatestDate: string
  records: ShipmentRecord[]
  configurations: ThorConfiguration[]
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
  code: 'invalid-prefix' | 'unknown-configuration' | 'no-data'
  message: string
}

export type EstimateResult = EstimateSuccess | EstimateFailure
