import { addWorkingDaysToWindow, isSupportedCountry, isSupportedShippingMethod } from './transit'
import { configurationKey, displayConfiguration, hasConfiguration } from './data'
import type {
  Confidence,
  CommunityReport,
  DateWindow,
  DispatchEstimate,
  EstimateInput,
  EstimateResult,
  ShipmentDataset,
  ShipmentRecord,
  ThorConfiguration
} from './types'

interface FrontierPoint {
  date: string
  day: number
  prefix: number
}

interface ForecastModel {
  name: string
  predict: (points: FrontierPoint[], target: number) => number
}

function lastPoint(points: FrontierPoint[]): FrontierPoint {
  const point = points.at(-1)
  if (!point) throw new Error('forecast requires at least one frontier point')
  return point
}

const DAY_MS = 86_400_000

function toDay(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS
}

function fromDay(day: number): string {
  return new Date(Math.round(day) * DAY_MS).toISOString().slice(0, 10)
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function quantile(values: number[], probability: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const index = (sorted.length - 1) * probability
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower] ?? 0
  const lowerValue = sorted[lower] ?? 0
  const upperValue = sorted[upper] ?? lowerValue
  return lowerValue + (upperValue - lowerValue) * (index - lower)
}

function matchingRecords(
  configuration: ThorConfiguration,
  records: ShipmentRecord[]
): ShipmentRecord[] {
  return records
    .filter((record) => configurationKey(record) === configurationKey(configuration))
    .sort((left, right) => left.date.localeCompare(right.date))
}

function fallbackRecords(
  configuration: ThorConfiguration,
  records: ShipmentRecord[],
  reports: CommunityReport[]
): ShipmentRecord[] {
  const sameVariant = records.filter(
    (record) =>
      record.tier === configuration.tier && record.storageVariant === configuration.storageVariant
  )
  const pooledReports = reports
    .filter(
      (report) =>
        report.tier === configuration.tier && report.storageVariant === configuration.storageVariant
    )
    .map(reportToRecord)
  if (sameVariant.length || pooledReports.length)
    return [...sameVariant, ...pooledReports].sort((left, right) =>
      left.date.localeCompare(right.date)
    )
  const sameTier = records.filter((record) => record.tier === configuration.tier)
  const sameTierReports = reports
    .filter((report) => report.tier === configuration.tier)
    .map(reportToRecord)
  if (sameTier.length || sameTierReports.length)
    return [...sameTier, ...sameTierReports].sort((left, right) =>
      left.date.localeCompare(right.date)
    )
  return [...records, ...reports.map(reportToRecord)].sort((left, right) =>
    left.date.localeCompare(right.date)
  )
}

function reportToRecord(report: CommunityReport): ShipmentRecord {
  return {
    date: report.dispatchedOn,
    color: report.color,
    tier: report.tier,
    storageVariant: report.storageVariant,
    lowerPrefix: report.orderPrefix,
    upperPrefix: report.orderPrefix,
    sourceLabel: `community report ${report.issueNumber}`
  }
}

function buildFrontier(records: ShipmentRecord[]): FrontierPoint[] {
  const orderedRecords = [...records].sort((left, right) => left.date.localeCompare(right.date))
  const firstDay = orderedRecords.length ? toDay(orderedRecords[0].date) : 0
  const byDate = new Map<string, number>()
  for (const record of orderedRecords) {
    byDate.set(record.date, Math.max(byDate.get(record.date) ?? 0, record.upperPrefix))
  }
  let runningPrefix = 0
  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, prefix]) => {
      runningPrefix = Math.max(runningPrefix, prefix)
      return { date, day: toDay(date) - firstDay, prefix: runningPrefix }
    })
}

function positiveRates(points: FrontierPoint[]): number[] {
  const rates: number[] = []
  for (let index = 1; index < points.length; index += 1) {
    const deltaDays = points[index].day - points[index - 1].day
    const deltaPrefix = points[index].prefix - points[index - 1].prefix
    if (deltaDays > 0 && deltaPrefix > 0) rates.push(deltaPrefix / deltaDays)
  }
  return rates
}

function medianRatePrediction(points: FrontierPoint[], target: number): number {
  const latest = lastPoint(points)
  const rates = positiveRates(points).slice(-5)
  if (!rates.length) return latest.day + Math.max(1, target - latest.prefix)
  return latest.day + Math.max(0, target - latest.prefix) / median(rates)
}

function theilSenPrediction(points: FrontierPoint[], target: number): number {
  const slopes: number[] = []
  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      const deltaDays = points[right].day - points[left].day
      const deltaPrefix = points[right].prefix - points[left].prefix
      if (deltaDays > 0 && deltaPrefix > 0) slopes.push(deltaPrefix / deltaDays)
    }
  }
  if (!slopes.length) return medianRatePrediction(points, target)
  const slope = median(slopes)
  const intercept = median(points.map((point) => point.prefix - slope * point.day))
  return Math.max(lastPoint(points).day, (target - intercept) / slope)
}

function models(): ForecastModel[] {
  return [
    { name: 'recent batch pace', predict: medianRatePrediction },
    { name: 'robust frontier trend', predict: theilSenPrediction }
  ]
}

function selectModel(points: FrontierPoint[]): { model: ForecastModel; residuals: number[] } {
  const candidates = models()
  const scores = candidates.map((model) => {
    const residuals: number[] = []
    for (let index = 2; index < points.length; index += 1) {
      const training = points.slice(0, index)
      const predicted = model.predict(training, points[index].prefix)
      residuals.push(Math.abs(predicted - points[index].day))
    }
    return {
      model,
      residuals,
      score: residuals.length
        ? residuals.reduce((total, residual) => total + residual, 0) / residuals.length
        : Number.POSITIVE_INFINITY
    }
  })
  const selected = scores.sort((left, right) => left.score - right.score)[0]
  return selected ?? { model: candidates[0], residuals: [] }
}

function windowAround(
  day: number,
  residuals: number[],
  points: FrontierPoint[],
  target: number
): DateWindow {
  const rates = positiveRates(points)
  const latest = lastPoint(points)
  const gap = Math.max(0, target - latest.prefix)
  const horizon = rates.length ? gap / median(rates) : gap / 100
  const baseline = rates.length ? Math.max(2, horizon * 0.2) : Math.max(4, horizon)
  const residualSpread = residuals.length ? quantile(residuals, 0.8) : baseline
  const sparseMultiplier = points.length < 5 ? 1.25 : 1
  const longHorizonMultiplier = horizon > 30 ? 1.35 : horizon > 14 ? 1.15 : 1
  const spread = Math.max(baseline, residualSpread) * sparseMultiplier * longHorizonMultiplier
  const start = Math.max(latest.day, day - spread)
  return {
    start: fromDay(toDay(points[0].date) + start),
    end: fromDay(toDay(points[0].date) + day + spread)
  }
}

function confidenceFor(
  status: DispatchEstimate['status'],
  observations: number,
  residuals: number[]
): Confidence {
  if (status === 'observed') return 'high'
  if (status === 'inferred') return observations >= 3 ? 'medium' : 'low'
  if (observations >= 6 && median(residuals) <= 5) return 'medium'
  return 'low'
}

function dispatchEstimate(
  configuration: ThorConfiguration,
  orderPrefix: number,
  records: ShipmentRecord[],
  sourceLatestDate: string,
  communityReports: CommunityReport[]
): DispatchEstimate {
  const matched = matchingRecords(configuration, records)
  const matchedCommunityReports = communityReports.filter(
    (report) => configurationKey(report) === configurationKey(configuration)
  )
  const calibrationRecords = [...matched, ...matchedCommunityReports.map(reportToRecord)]
  const exactMatches = matched.filter(
    (record) => orderPrefix >= record.lowerPrefix && orderPrefix <= record.upperPrefix
  )
  const points = buildFrontier(matched)
  const crossing = matched.find((record) => record.upperPrefix >= orderPrefix)
  if (exactMatches.length) {
    const latest = lastPoint(points)
    const exactDates = [...new Set(exactMatches.map((record) => record.date))].sort()
    const firstExactDate = exactDates[0]
    const lastExactDate = exactDates.at(-1)
    if (!firstExactDate || !lastExactDate) throw new Error('observed batch has no date')
    const ambiguousBoundary = exactDates.length > 1
    return {
      status: 'observed',
      likelyDate: lastExactDate,
      window: { start: firstExactDate, end: lastExactDate },
      confidence: ambiguousBoundary ? 'medium' : 'high',
      frontierPrefix: latest.prefix,
      observations: points.length,
      model: ambiguousBoundary ? 'published batch boundary' : 'published AYN batch',
      explanation: ambiguousBoundary
        ? `AYN lists ${orderPrefix}xx across adjacent batch dates, so the source boundary is treated as a range.`
        : `AYN explicitly lists ${orderPrefix}xx in a shipment batch on ${lastExactDate}.`
    }
  }
  if (points.length && (crossing || orderPrefix <= lastPoint(points).prefix)) {
    const latest = lastPoint(points)
    const inferredDate = crossing?.date ?? latest.date
    return {
      status: 'inferred',
      likelyDate: inferredDate,
      window: { start: inferredDate, end: inferredDate },
      confidence: confidenceFor('inferred', points.length, []),
      frontierPrefix: latest.prefix,
      observations: points.length,
      model: 'frontier crossing',
      explanation: `Your ${orderPrefix}xx bucket is behind the latest ${latest.prefix}xx frontier, but AYN does not list that exact bucket.`
    }
  }
  const pooledRecords = fallbackRecords(configuration, records, communityReports)
  const pooledPoints = buildFrontier(pooledRecords)
  const calibrationPoints = buildFrontier(calibrationRecords)
  const configurationProgress = positiveRates(calibrationPoints).length
  const usedFallback = !points.length || configurationProgress < 3
  const forecastPoints = usedFallback ? pooledPoints : calibrationPoints
  if (!forecastPoints.length) {
    return {
      status: 'insufficient',
      likelyDate: '',
      window: { start: '', end: '' },
      confidence: 'low',
      frontierPrefix: 0,
      observations: points.length,
      model: 'no usable history',
      explanation: 'There is not enough shipment history to estimate this queue yet.'
    }
  }
  const latest = lastPoint(forecastPoints)
  if (!points.length && orderPrefix <= latest.prefix) {
    return {
      status: 'insufficient',
      likelyDate: latest.date,
      window: { start: latest.date, end: latest.date },
      confidence: 'low',
      frontierPrefix: latest.prefix,
      observations: 0,
      model: 'pooled frontier',
      explanation: `AYN has not published a ${displayConfiguration(configuration)} row yet, but similar queues have passed ${orderPrefix}xx.`
    }
  }
  const selected = selectModel(forecastPoints)
  const relativeDay = selected.model.predict(forecastPoints, orderPrefix)
  const absoluteDay = toDay(forecastPoints[0].date) + relativeDay
  const window = windowAround(relativeDay, selected.residuals, forecastPoints, orderPrefix)
  const likelyDate = fromDay(Math.max(absoluteDay, toDay(sourceLatestDate)))
  window.start = window.start < sourceLatestDate ? sourceLatestDate : window.start
  window.end = window.end < likelyDate ? likelyDate : window.end
  return {
    status: usedFallback ? 'insufficient' : 'forecast',
    likelyDate,
    window,
    confidence: confidenceFor(
      usedFallback ? 'insufficient' : 'forecast',
      points.length,
      selected.residuals
    ),
    frontierPrefix: latest.prefix,
    observations: points.length,
    model: usedFallback ? `pooled ${selected.model.name}` : selected.model.name,
    explanation: usedFallback
      ? points.length
        ? 'This configuration has limited history, so the estimate uses the combined pace of similar Thor queues.'
        : `AYN has not published ${displayConfiguration(configuration)} yet, so the estimate uses the combined pace of similar Thor queues.`
      : `The estimate follows ${selected.model.name} from the observed shipment frontier.`
  }
}

export function estimateShipment(input: EstimateInput, source: ShipmentDataset): EstimateResult {
  const rawPrefix = String(input.orderPrefix)
  const parsedPrefix = Number(rawPrefix)
  if (
    !/^\d{4}$/.test(rawPrefix) ||
    !Number.isInteger(parsedPrefix) ||
    parsedPrefix < 0 ||
    parsedPrefix > 9999
  ) {
    return {
      ok: false,
      code: 'invalid-prefix',
      message: 'enter the four digits before the xx in your order number.'
    }
  }
  if (!isSupportedCountry(input.country) || !isSupportedShippingMethod(input.shippingMethod)) {
    return {
      ok: false,
      code: 'invalid-route',
      message: 'choose a supported destination and shipping method.'
    }
  }
  if (!source.records.length || !source.configurations.length) {
    return {
      ok: false,
      code: 'no-data',
      message: 'AYN shipment data is unavailable right now. Try again after the next refresh.'
    }
  }
  if (!hasConfiguration(input, source)) {
    return {
      ok: false,
      code: 'unknown-configuration',
      message: 'choose one of AYN’s current Thor variants.'
    }
  }
  const dispatch = dispatchEstimate(
    input,
    parsedPrefix,
    source.records,
    source.sourceLatestDate,
    source.communityReports ?? []
  )
  if (dispatch.status === 'insufficient' && !dispatch.likelyDate) {
    return { ok: false, code: 'no-data', message: dispatch.explanation }
  }
  const arrival = addWorkingDaysToWindow(
    dispatch.window,
    input.country,
    input.shippingMethod,
    source.communityReports ?? []
  )
  return {
    ok: true,
    input: { ...input, orderPrefix: parsedPrefix },
    dispatch,
    arrival,
    dataset: {
      fetchedAt: source.fetchedAt,
      sourceUrl: source.sourceUrl,
      sourceLatestDate: source.sourceLatestDate
    }
  }
}
