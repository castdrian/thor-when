import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { THOR_COLORS, THOR_VARIANTS, type CommunityReport } from '../src/lib/types'
import { SUPPORTED_COUNTRIES } from '../src/lib/transit'

export const REPORT_LABEL = 'shipping-report'
const API_ROOT = 'https://api.github.com'
const PAGE_SIZE = 100
const MAX_REPORTS = 1_000

interface GitHubIssue {
  number: number
  html_url: string
  body: string | null
  updated_at: string
  pull_request?: unknown
}

interface CommunityReportFile {
  schemaVersion: 1
  fetchedAt: string
  reports: CommunityReport[]
}

function field(body: string, label: string): string {
  const pattern = new RegExp(`^${label}:\\s*(.+?)\\s*$`, 'im')
  return body.match(pattern)?.[1]?.trim() ?? ''
}

function parseDate(value: string, now: Date): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return null
  if (date.getTime() > now.getTime()) return null
  return value
}

function storageVariant(value: string): CommunityReport['storageVariant'] | null {
  const normalized = value.toLowerCase().replace(/\s+/g, '')
  if (normalized === '128gb') return '128gb'
  if (normalized === '256gb') return '256gb'
  if (normalized === '512gb' || normalized === '512') return '512gb'
  if (normalized === '1tb' || normalized === '1024gb') return '1tb'
  return null
}

function tier(value: string): CommunityReport['tier'] | null {
  const normalized = value.toLowerCase()
  return THOR_VARIANTS.some((variant) => variant.tier === normalized)
    ? (normalized as CommunityReport['tier'])
    : null
}

function color(value: string): string | null {
  return THOR_COLORS.includes(value as (typeof THOR_COLORS)[number]) ? value : null
}

function country(value: string): string | null {
  return SUPPORTED_COUNTRIES.includes(value as (typeof SUPPORTED_COUNTRIES)[number]) ? value : null
}

function shippingMethod(value: string): CommunityReport['shippingMethod'] | null {
  if (value === 'dhl' || value === 'standard') return value
  return null
}

export function parseCommunityReport(issue: GitHubIssue, now = new Date()): CommunityReport | null {
  if (issue.pull_request || !issue.body) return null
  if (field(issue.body, 'Consent').toLowerCase() !== 'yes') return null
  const parsedColor = color(field(issue.body, 'Thor color'))
  const parsedTier = tier(field(issue.body, 'Thor tier'))
  const parsedStorage = storageVariant(field(issue.body, 'Thor storage'))
  const parsedPrefix = field(issue.body, 'Order bucket')
  const parsedCountry = country(field(issue.body, 'Destination country'))
  const parsedMethod = shippingMethod(field(issue.body, 'Shipping method'))
  const dispatchedOn = parseDate(field(issue.body, 'Dispatch date'), now)
  const arrivalValue = field(issue.body, 'Arrival date').toLowerCase()
  const deliveredOn =
    arrivalValue === 'not yet delivered' ? undefined : parseDate(arrivalValue, now)
  if (
    !parsedColor ||
    !parsedTier ||
    !parsedStorage ||
    !/^\d{4}$/.test(parsedPrefix) ||
    !parsedCountry ||
    !parsedMethod ||
    !dispatchedOn ||
    (arrivalValue !== 'not yet delivered' && !deliveredOn)
  )
    return null
  const variant = THOR_VARIANTS.find(
    (candidate) => candidate.tier === parsedTier && candidate.storageVariant === parsedStorage
  )
  if (!variant) return null
  if (deliveredOn && deliveredOn < dispatchedOn) return null
  return {
    issueNumber: issue.number,
    issueUrl: issue.html_url,
    submittedAt: issue.updated_at,
    color: parsedColor,
    tier: parsedTier,
    storageVariant: parsedStorage,
    orderPrefix: Number(parsedPrefix),
    country: parsedCountry,
    shippingMethod: parsedMethod,
    dispatchedOn,
    ...(deliveredOn ? { deliveredOn } : {})
  }
}

async function fetchIssues(token: string, repository: string): Promise<GitHubIssue[]> {
  const issues: GitHubIssue[] = []
  for (let page = 1; issues.length < MAX_REPORTS; page += 1) {
    const url = `${API_ROOT}/repos/${repository}/issues?state=all&labels=${encodeURIComponent(REPORT_LABEL)}&per_page=${PAGE_SIZE}&page=${page}`
    const response = await fetch(url, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28'
      }
    })
    if (!response.ok) throw new Error(`GitHub reports API returned HTTP ${response.status}`)
    const pageIssues = (await response.json()) as GitHubIssue[]
    issues.push(...pageIssues)
    if (pageIssues.length < PAGE_SIZE) break
  }
  return issues.slice(0, MAX_REPORTS)
}

export async function writeCommunityReports(
  destination = resolve(process.cwd(), 'data/community-reports.json')
): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  const repository = process.env.GITHUB_REPOSITORY
  if (!token || !repository) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required')
  const reports = new Map<number, CommunityReport>()
  for (const issue of await fetchIssues(token, repository)) {
    const report = parseCommunityReport(issue)
    if (report) reports.set(report.issueNumber, report)
  }
  const output: CommunityReportFile = {
    schemaVersion: 1,
    fetchedAt: new Date().toISOString(),
    reports: [...reports.values()].sort((left, right) => left.issueNumber - right.issueNumber)
  }
  await writeFile(destination, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  process.stdout.write(`accepted ${output.reports.length} community shipping reports\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await writeCommunityReports()
