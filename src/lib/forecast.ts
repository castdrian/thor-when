import { addWorkingDaysToWindow } from './transit'
import { configurationKey, hasConfiguration } from './data'
import type {
  Confidence,
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

function matchingRecords(
  configuration: ThorConfiguration,
  records: ShipmentRecord[]
): ShipmentRecord[] {
  return records
    .filter((record) => configurationKey(record) === configurationKey(configuration))
    .sort((left, right) => left.date.localeCompare(right.date))
}

function buildFrontier(records: ShipmentRecord[]): FrontierPoint[] {
  const firstDay = records.length ? toDay(records[0].date) : 0
  const byDate = new Map<string, number>()
  for (const record of records) {
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
  const rates = positiveRates(points).slice(-5)
  if (!rates.length) return points.at(-1)!.day + Math.max(1, target - points.at(-1)!.prefix)
  return points.at(-1)!.day + Math.max(0, target - points.at(-1)!.prefix) / median(rates)
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
  return Math.max(points.at(-1)!.day, (target - intercept) / slope)
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
      score: residuals.length ? median(residuals) : Number.POSITIVE_INFINITY
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
  const gap = Math.max(0, target - points.at(-1)!.prefix)
  const baseline = rates.length ? Math.max(2, (gap / median(rates)) * 0.2) : Math.max(4, gap / 100)
  const spread = Math.max(baseline, residuals.length ? median(residuals) : baseline)
  const start = Math.max(points.at(-1)!.day, day - spread)
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
  records: ShipmentRecord[]
): DispatchEstimate {
  const matched = matchingRecords(configuration, records)
  if (!matched.length) {
    return {
      status: 'insufficient',
      likelyDate: '',
      window: { start: '', end: '' },
      confidence: 'low',
      frontierPrefix: 0,
      observations: 0,
      model: 'no configuration history',
      explanation: 'There is no matching shipment history for this configuration yet.'
    }
  }
  const exact = matched.find(
    (record) => orderPrefix >= record.lowerPrefix && orderPrefix <= record.upperPrefix
  )
  const points = buildFrontier(matched)
  const latest = points.at(-1)!
  const crossing = matched.find((record) => record.upperPrefix >= orderPrefix)
  if (exact) {
    return {
      status: 'observed',
      likelyDate: exact.date,
      window: { start: exact.date, end: exact.date },
      confidence: 'high',
      frontierPrefix: latest.prefix,
      observations: points.length,
      model: 'published AYN batch',
      explanation: `AYN explicitly lists ${orderPrefix}xx in a shipment batch on ${exact.date}.`
    }
  }
  if (crossing || orderPrefix <= latest.prefix) {
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
  const pooledRecords = records.filter(
    (record) =>
      record.tier === configuration.tier && record.storageVariant === configuration.storageVariant
  )
  const pooledPoints = buildFrontier(pooledRecords)
  const forecastPoints = points.length >= 3 ? points : pooledPoints
  const selected = selectModel(forecastPoints)
  const relativeDay = selected.model.predict(forecastPoints, orderPrefix)
  const absoluteDay = toDay(forecastPoints[0].date) + relativeDay
  const window = windowAround(relativeDay, selected.residuals, forecastPoints, orderPrefix)
  const likelyDate = fromDay(absoluteDay)
  const usedFallback = points.length < 3
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
      ? 'This configuration has limited history, so the estimate uses the combined pace of similar Thor queues.'
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
  if (!hasConfiguration(input, source)) {
    return {
      ok: false,
      code: 'unknown-configuration',
      message: 'that Thor configuration is not in the latest shipment data.'
    }
  }
  const dispatch = dispatchEstimate(input, parsedPrefix, source.records)
  if (dispatch.status === 'insufficient' && !dispatch.likelyDate) {
    return { ok: false, code: 'no-data', message: dispatch.explanation }
  }
  const arrival = addWorkingDaysToWindow(dispatch.window, input.country, input.shippingMethod)
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
