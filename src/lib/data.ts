import rawDataset from '../../data/shipment-data.json'
import {
  THOR_COLORS,
  THOR_TIER_ORDER,
  THOR_VARIANTS,
  type ShipmentDataset,
  type ThorConfiguration,
  type ThorTier,
  type StorageVariant
} from './types'

export const SOURCE_URL = 'https://www.ayntec.com/pages/shipment-dashboard'
export const MAX_UI_SOURCE_AGE_DAYS = 14

export const dataset = {
  ...(rawDataset as ShipmentDataset),
  communityReports: []
} as ShipmentDataset

export function isDatasetStale(source: ShipmentDataset = dataset, now = new Date()): boolean {
  const latest = Date.parse(`${source.sourceLatestDate}T00:00:00Z`)
  if (Number.isNaN(latest)) return true
  return now.getTime() - latest > MAX_UI_SOURCE_AGE_DAYS * 86_400_000
}

const tierRank = (tier: ThorTier) => THOR_TIER_ORDER.indexOf(tier)

const sortConfigurations = (left: ThorConfiguration, right: ThorConfiguration) => {
  const colorOrder =
    THOR_COLORS.indexOf(left.color as (typeof THOR_COLORS)[number]) -
    THOR_COLORS.indexOf(right.color as (typeof THOR_COLORS)[number])
  if (colorOrder !== 0) return colorOrder
  const tierOrder = tierRank(left.tier) - tierRank(right.tier)
  if (tierOrder !== 0) return tierOrder
  return left.storageVariant.localeCompare(right.storageVariant)
}

export function configurationKey(configuration: ThorConfiguration): string {
  return `${configuration.color.toLowerCase()}|${configuration.tier}|${configuration.storageVariant}`
}

export function getConfigurations(source: ShipmentDataset = dataset): ThorConfiguration[] {
  const configurations = new Map<string, ThorConfiguration>()
  for (const color of THOR_COLORS) {
    for (const variant of THOR_VARIANTS) {
      const configuration = { color, tier: variant.tier, storageVariant: variant.storageVariant }
      configurations.set(configurationKey(configuration), configuration)
    }
  }
  for (const configuration of source.configurations) {
    configurations.set(configurationKey(configuration), configuration)
  }
  return [...configurations.values()].sort(sortConfigurations)
}

export function getColors(source: ShipmentDataset = dataset): string[] {
  return [
    ...new Set([
      ...THOR_COLORS,
      ...source.configurations.map((configuration) => configuration.color)
    ])
  ]
}

export function getTiers(source: ShipmentDataset = dataset): ThorTier[] {
  return [
    ...new Set([
      ...THOR_TIER_ORDER,
      ...source.configurations.map((configuration) => configuration.tier)
    ])
  ]
}

export function getStorageVariants(
  tier?: ThorTier,
  source: ShipmentDataset = dataset
): StorageVariant[] {
  const catalog = THOR_VARIANTS.filter((variant) => !tier || variant.tier === tier).map(
    (variant) => variant.storageVariant
  )
  const observed = source.configurations
    .filter((configuration) => !tier || configuration.tier === tier)
    .map((configuration) => configuration.storageVariant)
  return [...new Set([...catalog, ...observed])]
}

export function hasConfiguration(
  configuration: ThorConfiguration,
  source: ShipmentDataset = dataset
): boolean {
  return getConfigurations(source).some(
    (candidate) => configurationKey(candidate) === configurationKey(configuration)
  )
}

export function displayTier(tier: ThorTier): string {
  return tier[0].toUpperCase() + tier.slice(1)
}

export function displayStorage(storageVariant: StorageVariant): string {
  return storageVariant.toUpperCase()
}

export function displayConfiguration(configuration: ThorConfiguration): string {
  const variant = THOR_VARIANTS.find(
    (candidate) =>
      candidate.tier === configuration.tier &&
      candidate.storageVariant === configuration.storageVariant
  )
  return `${configuration.color} ${variant?.label ?? `${displayTier(configuration.tier)} · ${displayStorage(configuration.storageVariant)}`}`
}
