import { displayConfiguration } from './data'
import { formatDate, formatWindow } from './format'
import type { EstimateSuccess } from './types'

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ??
      character
  )
}

function shorten(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
}

export function buildOgImage(result: EstimateSuccess): string {
  const configuration = shorten(displayConfiguration(result.input), 34)
  const dispatchDate = formatDate(result.dispatch.likelyDate)
  const dispatchWindow = shorten(
    formatWindow(result.dispatch.window.start, result.dispatch.window.end),
    42
  )
  const arrivalWindow = shorten(
    formatWindow(result.arrival.window.start, result.arrival.window.end),
    42
  )
  const route = shorten(`${result.arrival.methodLabel} · ${result.input.country}`, 28)
  const confidence = `${result.dispatch.confidence} confidence`.toUpperCase()
  const model = shorten(result.dispatch.model, 26)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1524"/>
      <stop offset="1" stop-color="#03070d"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#83b6e6" stop-opacity=".26"/>
      <stop offset="1" stop-color="#3e6c8f" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#background)"/>
  <circle cx="1050" cy="-30" r="300" fill="url(#accent)"/>
  <rect x="52" y="44" width="1096" height="542" rx="36" fill="#0e1a2b" stroke="#6686a6" stroke-opacity=".34"/>
  <circle cx="92" cy="94" r="9" fill="#83b6e6"/>
  <text x="116" y="103" fill="#edf3fb" font-family="Roboto, sans-serif" font-size="28" font-weight="700">thor when?</text>
  <text x="90" y="157" fill="#9cafc3" font-family="Roboto, sans-serif" font-size="15" letter-spacing="3">YOUR THOR ESTIMATE</text>
  <text x="90" y="202" fill="#edf3fb" font-family="Roboto, sans-serif" font-size="30" font-weight="700">${escapeXml(configuration)} · ${result.input.orderPrefix}</text>
  <line x1="90" y1="228" x2="1110" y2="228" stroke="#6686a6" stroke-opacity=".25"/>
  <text x="90" y="270" fill="#9cafc3" font-family="Roboto, sans-serif" font-size="15" letter-spacing="3">MOST LIKELY DISPATCH</text>
  <text x="90" y="330" fill="#f4f8ff" font-family="Roboto, sans-serif" font-size="56" font-weight="700">${escapeXml(dispatchDate)}</text>
  <text x="90" y="365" fill="#a7b4c5" font-family="Roboto, sans-serif" font-size="18">likely between ${escapeXml(dispatchWindow)}</text>
  <rect x="700" y="258" width="380" height="156" rx="23" fill="#16263a" stroke="#6686a6" stroke-opacity=".23"/>
  <text x="728" y="296" fill="#9cafc3" font-family="Roboto, sans-serif" font-size="14" letter-spacing="2.5">ESTIMATED ARRIVAL</text>
  <text x="728" y="340" fill="#f4f8ff" font-family="Roboto, sans-serif" font-size="24" font-weight="700">${escapeXml(arrivalWindow)}</text>
  <text x="728" y="375" fill="#f1c8b7" font-family="Roboto, sans-serif" font-size="16" font-weight="700">${escapeXml(route)}</text>
  <text x="90" y="460" fill="#9cafc3" font-family="Roboto, sans-serif" font-size="14" letter-spacing="2.5">CONFIDENCE</text>
  <text x="90" y="493" fill="#edf3fb" font-family="Roboto, sans-serif" font-size="19" font-weight="700">${escapeXml(confidence)}</text>
  <text x="330" y="460" fill="#9cafc3" font-family="Roboto, sans-serif" font-size="14" letter-spacing="2.5">FRONTIER</text>
  <text x="330" y="493" fill="#edf3fb" font-family="Roboto, sans-serif" font-size="19" font-weight="700">${result.dispatch.frontierPrefix}</text>
  <text x="560" y="460" fill="#9cafc3" font-family="Roboto, sans-serif" font-size="14" letter-spacing="2.5">MODEL</text>
  <text x="560" y="493" fill="#edf3fb" font-family="Roboto, sans-serif" font-size="19" font-weight="700">${escapeXml(model)}</text>
  <text x="90" y="548" fill="#7f93aa" font-family="Roboto, sans-serif" font-size="16">unofficial estimate · thor-when.dylib.dev</text>
</svg>`
}
