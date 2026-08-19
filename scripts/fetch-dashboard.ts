import { parse } from 'node-html-parser'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import type {
  ShipmentDataset,
  ShipmentRecord,
  ThorConfiguration,
  ThorTier,
  StorageVariant
} from '../src/lib/types'
import { THOR_COLORS, THOR_VARIANTS } from '../src/lib/types'

export const SOURCE_URL = 'https://www.ayntec.com/pages/shipment-dashboard'
const MAX_RESPONSE_BYTES = 2_000_000
const MAX_SOURCE_AGE_DAYS = 45
const MIN_RECOGNIZED_RECORDS = 10
const MIN_CONFIGURATIONS = 3
const DAY_MS = 86_400_000

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

export function parseConfiguration(
  label: string
): { color: string; tier: ThorTier; storageVariant: StorageVariant } | null {
  const normalized = label
    .replace(/[（(]\s*512\s*[）)]/i, ' 512')
    .replace(/[（(]\s*1\s*tb\s*[）)]/i, ' 1TB')
    .replace(/\s+/g, ' ')
    .trim()
  const match = normalized.match(/^(.*?)\s+(Lite|Base|Pro|Max)(?:\s+(512|1TB))?$/i)
  if (!match) return null
  const color = match[1].trim()
  if (!THOR_COLORS.includes(color as (typeof THOR_COLORS)[number])) return null
  const tier = match[2].toLowerCase() as ThorTier
  const storageLabel = match[3]?.toLowerCase()
  const storageVariant =
    tier === 'max' ? (storageLabel === '512' ? '512gb' : '1tb') : tier === 'pro' ? '256gb' : '128gb'
  return {
    color,
    tier,
    storageVariant
  }
}

function parseSourceDate(value: string): string {
  const match = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!match) throw new Error(`invalid date in shipment dashboard: ${value}`)
  const date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date)
    throw new Error(`invalid date in shipment dashboard: ${value}`)
  return date
}

export function parseDashboardHtml(
  html: string,
  fetchedAt = new Date().toISOString()
): ShipmentDataset {
  const root = parse(html)
  const paragraphs = root
    .querySelectorAll('p')
    .map((paragraph) => decodeHtml(paragraph.textContent).replace(/\s+/g, ' ').trim())
  const records: ShipmentRecord[] = []
  let currentDate = ''
  for (const paragraph of paragraphs) {
    const dateMatch = paragraph.match(/^(\d{4}\/\d{1,2}\/\d{1,2})$/)
    if (dateMatch) {
      currentDate = parseSourceDate(dateMatch[1])
      continue
    }
    if (/^AYN Thor\s+/i.test(paragraph) && !currentDate)
      throw new Error('shipment row appeared before its source date')
    const row = paragraph.match(/^AYN Thor\s+(.+?):\s*(\d{4})xx\s*(?:--|-|–|—)\s*(\d{4})xx$/i)
    if (!row) {
      if (/^AYN Thor\s+/i.test(paragraph)) throw new Error(`malformed shipment row: ${paragraph}`)
      continue
    }
    const configuration = parseConfiguration(row[1])
    if (!configuration) throw new Error(`unknown Thor configuration: ${row[1]}`)
    records.push({
      date: currentDate,
      ...configuration,
      lowerPrefix: Number(row[2]),
      upperPrefix: Number(row[3]),
      sourceLabel: paragraph
    })
  }
  if (records.length < MIN_RECOGNIZED_RECORDS)
    throw new Error('the shipment dashboard did not contain enough recognized Thor rows')
  for (const record of records) {
    if (record.lowerPrefix > record.upperPrefix)
      throw new Error(`invalid range in ${record.sourceLabel}`)
  }
  const uniqueRows = new Set(
    records.map(
      (record) =>
        `${record.date}|${record.color}|${record.tier}|${record.storageVariant}|${record.lowerPrefix}|${record.upperPrefix}`
    )
  )
  if (uniqueRows.size !== records.length)
    throw new Error('the shipment dashboard contains duplicate shipment rows')
  const configurations: ThorConfiguration[] = THOR_COLORS.flatMap((color) =>
    THOR_VARIANTS.map((variant) => ({
      color,
      tier: variant.tier,
      storageVariant: variant.storageVariant
    }))
  )
  if (configurations.length < MIN_CONFIGURATIONS)
    throw new Error('the shipment dashboard did not contain enough Thor configurations')
  const sourceLatestDate = records
    .map((record) => record.date)
    .sort()
    .at(-1)
  if (!sourceLatestDate) throw new Error('the shipment dashboard did not contain a latest date')
  return {
    schemaVersion: 2,
    fetchedAt,
    sourceUrl: SOURCE_URL,
    sourceLatestDate,
    records,
    configurations
  }
}

export async function fetchDashboard(): Promise<ShipmentDataset> {
  if (!SOURCE_URL.startsWith('https://')) throw new Error('source URL must use HTTPS')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: { accept: 'text/html' }
    })
    if (!response.ok) throw new Error(`source returned HTTP ${response.status}`)
    if (!response.url.startsWith('https://'))
      throw new Error('source redirected to a non-HTTPS URL')
    const contentLength = Number(response.headers.get('content-length') ?? 0)
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error('source response is unexpectedly large')
    const html = await response.text()
    if (new TextEncoder().encode(html).byteLength > MAX_RESPONSE_BYTES)
      throw new Error('source response is unexpectedly large')
    const dataset = parseDashboardHtml(html)
    const latest = Date.parse(`${dataset.sourceLatestDate}T00:00:00Z`)
    const ageInDays = (Date.now() - latest) / DAY_MS
    if (ageInDays > MAX_SOURCE_AGE_DAYS)
      throw new Error(`shipment dashboard is more than ${MAX_SOURCE_AGE_DAYS} days old`)
    return dataset
  } finally {
    clearTimeout(timeout)
  }
}

export async function writeFreshDataset(
  destination = resolve(process.cwd(), 'data/shipment-data.json')
): Promise<void> {
  const dataset = await fetchDashboard()
  try {
    const previous = JSON.parse(await readFile(destination, 'utf8')) as ShipmentDataset
    if (previous.sourceLatestDate && dataset.sourceLatestDate < previous.sourceLatestDate) {
      throw new Error(
        `source freshness regressed from ${previous.sourceLatestDate} to ${dataset.sourceLatestDate}`
      )
    }
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('existing shipment data is not valid JSON')
    if (error instanceof Error && !error.message.includes('ENOENT')) throw error
  }
  await writeFile(destination, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8')
  process.stdout.write(
    `wrote ${dataset.records.length} shipment rows through ${dataset.sourceLatestDate}\n`
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await writeFreshDataset()
