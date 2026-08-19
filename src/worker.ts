import { parseCommunityReportInput } from './lib/report'
import type { CommunityReport } from './lib/types'

interface ReportRow {
  id: string
  color: string
  tier: CommunityReport['tier']
  storage_variant: CommunityReport['storageVariant']
  order_prefix: number
  country: string
  shipping_method: CommunityReport['shippingMethod']
  dispatched_on: string
  delivered_on: string
  submitted_at: string
}

const MAX_BODY_BYTES = 16_384
const MAX_REPORTS = 2_000

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      ...headers
    }
  })
}

function reportFromRow(row: ReportRow): CommunityReport {
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    color: row.color,
    tier: row.tier,
    storageVariant: row.storage_variant,
    orderPrefix: row.order_prefix,
    country: row.country,
    shippingMethod: row.shipping_method,
    dispatchedOn: row.dispatched_on,
    ...(row.delivered_on ? { deliveredOn: row.delivered_on } : {})
  }
}

function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  return origin === env.PUBLIC_ORIGIN || origin === new URL(request.url).origin
}

async function listReports(env: Env): Promise<CommunityReport[]> {
  const result = await env.DB.prepare(
    `SELECT id, color, tier, storage_variant, order_prefix, country, shipping_method, dispatched_on, delivered_on, submitted_at
     FROM reports
     ORDER BY submitted_at DESC
     LIMIT ?`
  )
    .bind(MAX_REPORTS)
    .all<ReportRow>()
  return result.results.map(reportFromRow)
}

async function createReport(request: Request, env: Env): Promise<Response> {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) return json({ error: 'report is too large' }, 413)
  const body = await request.text()
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES)
    return json({ error: 'report is too large' }, 413)
  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return json({ error: 'report is not valid JSON' }, 400)
  }
  const report = parseCommunityReportInput(payload)
  if (!report) return json({ error: 'check the report fields and confirmation' }, 400)
  const id = crypto.randomUUID()
  const submittedAt = new Date().toISOString()
  try {
    await env.DB.prepare(
      `INSERT INTO reports (id, color, tier, storage_variant, order_prefix, country, shipping_method, dispatched_on, delivered_on, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        report.color,
        report.tier,
        report.storageVariant,
        report.orderPrefix,
        report.country,
        report.shippingMethod,
        report.dispatchedOn,
        report.deliveredOn ?? '',
        submittedAt
      )
      .run()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes('unique'))
      return json({ error: 'that report is already included' }, 409)
    return json({ error: 'the report could not be saved right now' }, 503)
  }
  return json({ report: { ...report, id, submittedAt } satisfies CommunityReport }, 201)
}

async function handleReports(request: Request, env: Env): Promise<Response> {
  if (!originAllowed(request, env)) return json({ error: 'origin not allowed' }, 403)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method === 'GET') {
    try {
      return json({ reports: await listReports(env) })
    } catch {
      return json({ error: 'reports are temporarily unavailable' }, 503)
    }
  }
  if (request.method === 'POST') return createReport(request, env)
  return json({ error: 'method not allowed' }, 405, { allow: 'GET, POST, OPTIONS' })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/reports') return handleReports(request, env)
    if (url.pathname === '/api/health') return json({ ok: true })
    return env.ASSETS.fetch(request)
  }
}
