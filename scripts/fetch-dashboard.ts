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

export const SOURCE_URL = 'https://www.ayntec.com/pages/shipment-dashboard'
const MAX_RESPONSE_BYTES = 2_000_000

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
    .replace(/[（(]\s*512\s*[）)]/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  const match = normalized.match(/^(.*?)\s+(Lite|Base|Pro|Max)$/i)
  if (!match) return null
  const tier = match[2].toLowerCase() as ThorTier
  return { color: match[1].trim(), tier, storageVariant: /512/i.test(label) ? '512' : 'standard' }
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
      const [year, month, day] = dateMatch[1].split('/')
      currentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      continue
    }
    const row = paragraph.match(/^AYN Thor\s+(.+?):\s*(\d{4})xx\s*--\s*(\d{4})xx$/i)
    if (!row || !currentDate) continue
    const configuration = parseConfiguration(row[1])
    if (!configuration) continue
    records.push({
      date: currentDate,
      ...configuration,
      lowerPrefix: Number(row[2]),
      upperPrefix: Number(row[3]),
      sourceLabel: paragraph
    })
  }
  if (records.length < 3)
    throw new Error('the shipment dashboard did not contain enough recognized Thor rows')
  for (const record of records) {
    if (record.lowerPrefix > record.upperPrefix)
      throw new Error(`invalid range in ${record.sourceLabel}`)
    if (Number.isNaN(Date.parse(`${record.date}T00:00:00Z`)))
      throw new Error(`invalid date in ${record.sourceLabel}`)
  }
  const uniqueRows = new Set(
    records.map(
      (record) =>
        `${record.date}|${record.color}|${record.tier}|${record.storageVariant}|${record.lowerPrefix}|${record.upperPrefix}`
    )
  )
  if (uniqueRows.size !== records.length)
    throw new Error('the shipment dashboard contains duplicate shipment rows')
  const configurations = [
    ...new Map(
      records.map((record) => {
        const configuration: ThorConfiguration = {
          color: record.color,
          tier: record.tier,
          storageVariant: record.storageVariant
        }
        return [`${record.color}|${record.tier}|${record.storageVariant}`, configuration]
      })
    ).values()
  ]
  const sourceLatestDate = records
    .map((record) => record.date)
    .sort()
    .at(-1)!
  return {
    schemaVersion: 1,
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
    const contentLength = Number(response.headers.get('content-length') ?? 0)
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error('source response is unexpectedly large')
    const html = await response.text()
    if (new TextEncoder().encode(html).byteLength > MAX_RESPONSE_BYTES)
      throw new Error('source response is unexpectedly large')
    return parseDashboardHtml(html)
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
