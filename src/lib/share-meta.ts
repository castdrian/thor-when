import { displayConfiguration } from './data'
import { formatDate, formatWindow } from './format'
import type { EstimateSuccess } from './types'

export interface ShareMetadata {
  title: string
  description: string
  imageAlt: string
}

export function buildShareMetadata(result: EstimateSuccess): ShareMetadata {
  const configuration = displayConfiguration(result.input)
  const order = result.input.orderPrefix
  const dispatch = formatWindow(result.dispatch.window.start, result.dispatch.window.end)
  const arrival = formatWindow(result.arrival.window.start, result.arrival.window.end)
  return {
    title: `thor when? · ${configuration} · ${order}`,
    description: `${configuration} order ${order}: dispatch ${dispatch}; arrival ${arrival}. unofficial estimate.`,
    imageAlt: `thor when? estimate for ${configuration} order ${order}, dispatch ${formatDate(result.dispatch.likelyDate)}`
  }
}
