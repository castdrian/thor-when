import { displayConfiguration } from './data'
import { formatDate } from './format'
import type { EstimateSuccess } from './types'

export interface ShareMetadata {
  title: string
  description: string
  imageAlt: string
}

export function buildShareMetadata(result: EstimateSuccess): ShareMetadata {
  const configuration = displayConfiguration(result.input)
  const order = result.input.orderPrefix
  return {
    title: `thor when? · ${configuration} · ${order}`,
    description: 'see when your ayn thor will probably ship and arrive.',
    imageAlt: `thor when? estimate for ${configuration} order ${order}, dispatch ${formatDate(result.dispatch.likelyDate)}`
  }
}
