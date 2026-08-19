import { estimateShipment } from './forecast'
import type { CommunityReport, Confidence, EstimateSuccess, ShipmentDataset } from './types'

export interface InsightReportRow {
  report: CommunityReport
  estimate: EstimateSuccess | null
  dispatchMissDays: number | null
  dispatchWithinWindow: boolean | null
  arrivalMissDays: number | null
  arrivalWithinWindow: boolean | null
}

export interface InsightMetrics {
  totalSubmissions: number
  deliveredSubmissions: number
  validEstimates: number
  dispatchEvaluations: number
  dispatchWithinWindow: number
  medianDispatchMissDays: number | null
  arrivalEvaluations: number
  arrivalWithinWindow: number
  medianArrivalMissDays: number | null
  routeCount: number
  configurationCount: number
  confidence: Record<Confidence, number>
  latestSubmission: string | null
  rows: InsightReportRow[]
}

function dayDistance(left: string, right: string): number {
  return Math.abs(
    Math.round((Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) / 86_400_000)
  )
}

function inWindow(value: string, start: string, end: string): boolean {
  return value >= start && value <= end
}

function windowMissDays(value: string, start: string, end: string): number {
  if (value < start) return dayDistance(value, start)
  if (value > end) return dayDistance(value, end)
  return 0
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const ordered = [...values].sort((left, right) => left - right)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2 === 0
    ? Math.round(((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2)
    : (ordered[middle] ?? null)
}

function estimateForReport(
  report: CommunityReport,
  source: ShipmentDataset
): EstimateSuccess | null {
  const result = estimateShipment(
    {
      color: report.color,
      tier: report.tier,
      storageVariant: report.storageVariant,
      orderPrefix: String(report.orderPrefix),
      country: report.country,
      shippingMethod: report.shippingMethod
    },
    source
  )
  return result.ok ? result : null
}

export function calculateInsights(source: ShipmentDataset): InsightMetrics {
  const reports = [...(source.communityReports ?? [])].sort((left, right) =>
    right.submittedAt.localeCompare(left.submittedAt)
  )
  const baseline = { ...source, communityReports: [] }
  const rows = reports.map((report): InsightReportRow => {
    const estimate = estimateForReport(report, baseline)
    if (!estimate) {
      return {
        report,
        estimate: null,
        dispatchMissDays: null,
        dispatchWithinWindow: null,
        arrivalMissDays: null,
        arrivalWithinWindow: null
      }
    }
    const dispatchMissDays = dayDistance(estimate.dispatch.likelyDate, report.dispatchedOn)
    const dispatchWithinWindow = inWindow(
      report.dispatchedOn,
      estimate.dispatch.window.start,
      estimate.dispatch.window.end
    )
    const arrivalMissDays = report.deliveredOn
      ? windowMissDays(
          report.deliveredOn,
          estimate.arrival.window.start,
          estimate.arrival.window.end
        )
      : null
    const arrivalWithinWindow = report.deliveredOn
      ? inWindow(report.deliveredOn, estimate.arrival.window.start, estimate.arrival.window.end)
      : null
    return {
      report,
      estimate,
      dispatchMissDays,
      dispatchWithinWindow,
      arrivalMissDays,
      arrivalWithinWindow
    }
  })
  const dispatchRows = rows.filter(
    (
      row
    ): row is InsightReportRow & {
      estimate: EstimateSuccess
      dispatchMissDays: number
      dispatchWithinWindow: boolean
    } => row.estimate !== null && row.dispatchMissDays !== null && row.dispatchWithinWindow !== null
  )
  const arrivalRows = rows.filter(
    (
      row
    ): row is InsightReportRow & {
      estimate: EstimateSuccess
      arrivalMissDays: number
      arrivalWithinWindow: boolean
    } => row.estimate !== null && row.arrivalMissDays !== null && row.arrivalWithinWindow !== null
  )
  const routeKeys = new Set(reports.map((report) => `${report.country}|${report.shippingMethod}`))
  const configurationKeys = new Set(
    reports.map((report) => `${report.color}|${report.tier}|${report.storageVariant}`)
  )
  const confidence: Record<Confidence, number> = { high: 0, medium: 0, low: 0 }
  for (const row of rows) {
    if (row.estimate) confidence[row.estimate.dispatch.confidence] += 1
  }
  return {
    totalSubmissions: reports.length,
    deliveredSubmissions: reports.filter((report) => report.deliveredOn).length,
    validEstimates: rows.filter((row) => row.estimate).length,
    dispatchEvaluations: dispatchRows.length,
    dispatchWithinWindow: dispatchRows.filter((row) => row.dispatchWithinWindow).length,
    medianDispatchMissDays: median(dispatchRows.map((row) => row.dispatchMissDays)),
    arrivalEvaluations: arrivalRows.length,
    arrivalWithinWindow: arrivalRows.filter((row) => row.arrivalWithinWindow).length,
    medianArrivalMissDays: median(arrivalRows.map((row) => row.arrivalMissDays)),
    routeCount: routeKeys.size,
    configurationCount: configurationKeys.size,
    confidence,
    latestSubmission: reports[0]?.submittedAt ?? null,
    rows
  }
}
