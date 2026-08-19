import rawDataset from '../../data/shipment-data.json'
import type { ShipmentDataset, ThorConfiguration, ThorTier, StorageVariant } from './types'

export const SOURCE_URL = 'https://www.ayntec.com/pages/shipment-dashboard'
export const MAX_UI_SOURCE_AGE_DAYS = 14

export const dataset = rawDataset as ShipmentDataset

export function isDatasetStale(source: ShipmentDataset = dataset, now = new Date()): boolean {
  const latest = Date.parse(`${source.sourceLatestDate}T00:00:00Z`)
  if (Number.isNaN(latest)) return true
  return now.getTime() - latest > MAX_UI_SOURCE_AGE_DAYS * 86_400_000
}

const sortConfigurations = (left: ThorConfiguration, right: ThorConfiguration) =>
  `${left.color}-${left.tier}-${left.storageVariant}`.localeCompare(
    `${right.color}-${right.tier}-${right.storageVariant}`
  )

export function configurationKey(configuration: ThorConfiguration): string {
  return `${configuration.color.toLowerCase()}|${configuration.tier}|${configuration.storageVariant}`
}

export function getConfigurations(source: ShipmentDataset = dataset): ThorConfiguration[] {
  return [...source.configurations].sort(sortConfigurations)
}

export function getColors(source: ShipmentDataset = dataset): string[] {
  return [...new Set(source.configurations.map((configuration) => configuration.color))].sort()
}

export function getTiers(source: ShipmentDataset = dataset): ThorTier[] {
  return [...new Set(source.configurations.map((configuration) => configuration.tier))].sort()
}

export function getStorageVariants(source: ShipmentDataset = dataset): StorageVariant[] {
  return [
    ...new Set(source.configurations.map((configuration) => configuration.storageVariant))
  ].sort()
}

export function hasConfiguration(
  configuration: ThorConfiguration,
  source: ShipmentDataset = dataset
): boolean {
  return source.configurations.some(
    (candidate) => configurationKey(candidate) === configurationKey(configuration)
  )
}

export function displayTier(tier: ThorTier): string {
  return tier[0].toUpperCase() + tier.slice(1)
}

export function displayStorage(storageVariant: StorageVariant): string {
  return storageVariant === '512' ? '512 gb' : 'standard storage'
}

export function displayConfiguration(configuration: ThorConfiguration): string {
  return `${configuration.color} ${displayTier(configuration.tier)} · ${displayStorage(configuration.storageVariant)}`
}
