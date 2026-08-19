import type { ArrivalEstimate, CommunityReport, DateWindow, ShippingMethod } from './types'

const BRAZIL = 'Brazil'
export const AYN_SHIPPING_POLICY_URL = 'https://www.ayntec.com/policies/shipping-policy'

export const SUPPORTED_COUNTRIES = [
  'Afghanistan',
  'Åland Islands',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Anguilla',
  'Antigua & Barbuda',
  'Argentina',
  'Armenia',
  'Aruba',
  'Ascension Island',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bermuda',
  'Bhutan',
  'Bolivia',
  'Bosnia & Herzegovina',
  'Botswana',
  'Brazil',
  'British Indian Ocean Territory',
  'British Virgin Islands',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Cape Verde',
  'Caribbean Netherlands',
  'Cayman Islands',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Christmas Island',
  'Cocos (Keeling) Islands',
  'Colombia',
  'Comoros',
  'Congo - Brazzaville',
  'Congo - Kinshasa',
  'Cook Islands',
  'Costa Rica',
  'Côte d’Ivoire',
  'Croatia',
  'Curaçao',
  'Cyprus',
  'Czechia',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Falkland Islands',
  'Faroe Islands',
  'Fiji',
  'Finland',
  'France',
  'French Guiana',
  'French Polynesia',
  'French Southern Territories',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Gibraltar',
  'Greece',
  'Greenland',
  'Grenada',
  'Guadeloupe',
  'Guatemala',
  'Guernsey',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hong Kong SAR',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iraq',
  'Ireland',
  'Isle of Man',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jersey',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kosovo',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Macao SAR',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Martinique',
  'Mauritania',
  'Mauritius',
  'Mayotte',
  'Mexico',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Montserrat',
  'Morocco',
  'Mozambique',
  'Myanmar (Burma)',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Caledonia',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'Niue',
  'Norfolk Island',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palestinian Territories',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Pitcairn Islands',
  'Poland',
  'Portugal',
  'Qatar',
  'Réunion',
  'Romania',
  'Russia',
  'Rwanda',
  'Samoa',
  'San Marino',
  'São Tomé & Príncipe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Sint Maarten',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Georgia & South Sandwich Islands',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'St. Barthélemy',
  'St. Helena',
  'St. Kitts & Nevis',
  'St. Lucia',
  'St. Martin',
  'St. Pierre & Miquelon',
  'St. Vincent & Grenadines',
  'Sudan',
  'Suriname',
  'Svalbard & Jan Mayen',
  'Sweden',
  'Switzerland',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tokelau',
  'Tonga',
  'Trinidad & Tobago',
  'Tristan da Cunha',
  'Tunisia',
  'Türkiye',
  'Turkmenistan',
  'Turks & Caicos Islands',
  'Tuvalu',
  'U.S. Outlying Islands',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Wallis & Futuna',
  'Western Sahara',
  'Yemen',
  'Zambia',
  'Zimbabwe'
] as const

export const COUNTRY_OPTIONS = SUPPORTED_COUNTRIES

export function isSupportedCountry(country: string): boolean {
  return SUPPORTED_COUNTRIES.includes(country as (typeof SUPPORTED_COUNTRIES)[number])
}

export function isSupportedShippingMethod(method: string): method is ShippingMethod {
  return method === 'dhl' || method === 'standard'
}

export function transitRange(
  country: string,
  method: ShippingMethod
): { min: number; max: number; label: string } {
  if (!isSupportedCountry(country)) throw new Error('unsupported destination country')
  if (!isSupportedShippingMethod(method)) throw new Error('unsupported shipping method')
  if (method === 'dhl') return { min: 3, max: 7, label: 'DHL' }
  if (country === BRAZIL) return { min: 15, max: 30, label: '4PX' }
  return { min: 15, max: 20, label: '4PX' }
}

export function addWorkingDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  let remaining = days
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1)
    const weekday = date.getUTCDay()
    if (weekday !== 0 && weekday !== 6) remaining -= 1
  }
  return date.toISOString().slice(0, 10)
}

export function addCalendarDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function quantile(values: number[], probability: number): number {
  const sorted = [...values].sort((left, right) => left - right)
  if (!sorted.length) return 0
  const index = (sorted.length - 1) * probability
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower] ?? 0
  return (sorted[lower] ?? 0) + ((sorted[upper] ?? 0) - (sorted[lower] ?? 0)) * (index - lower)
}

function workingDayDistance(start: string, end: string): number {
  const date = new Date(`${start}T00:00:00Z`)
  const target = new Date(`${end}T00:00:00Z`)
  let days = 0
  while (date < target) {
    date.setUTCDate(date.getUTCDate() + 1)
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) days += 1
  }
  return days
}

function calendarDayDistance(start: string, end: string): number {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000
  )
}

function communityTransitRange(
  policyRange: { min: number; max: number },
  country: string,
  method: ShippingMethod,
  reports: CommunityReport[]
): { min: number; max: number; sampleSize: number } {
  const observations = reports
    .filter(
      (report) =>
        report.country === country &&
        report.shippingMethod === method &&
        report.deliveredOn !== undefined
    )
    .map((report) =>
      method === 'dhl'
        ? workingDayDistance(report.dispatchedOn, report.deliveredOn ?? report.dispatchedOn)
        : calendarDayDistance(report.dispatchedOn, report.deliveredOn ?? report.dispatchedOn)
    )
    .filter((days) => days > 0)
  if (observations.length < 3) return { ...policyRange, sampleSize: observations.length }
  const observedMin = Math.max(1, Math.round(quantile(observations, 0.2)))
  const observedMax = Math.max(observedMin, Math.round(quantile(observations, 0.8)))
  return {
    min: Math.max(1, Math.round((policyRange.min + observedMin) / 2)),
    max: Math.max(1, Math.round((policyRange.max + observedMax) / 2)),
    sampleSize: observations.length
  }
}

export function addWorkingDaysToWindow(
  window: DateWindow,
  country: string,
  method: ShippingMethod,
  reports: CommunityReport[] = [],
  earliestDispatch = window.start
): ArrivalEstimate {
  const policyRange = transitRange(country, method)
  const evidence = communityTransitRange(policyRange, country, method, reports)
  const range = { ...policyRange, ...evidence }
  const addDays = method === 'dhl' ? addWorkingDays : addCalendarDays
  const evidenceNote =
    evidence.sampleSize >= 3
      ? ` This window also blends ${evidence.sampleSize} anonymous community delivery reports for this route.`
      : ''
  return {
    window: {
      start: addDays(window.start < earliestDispatch ? earliestDispatch : window.start, range.min),
      end: addDays(window.end, range.max)
    },
    transitDays: { min: range.min, max: range.max },
    methodLabel: range.label,
    explanation:
      method === 'dhl'
        ? `AYN lists DHL at about 3–7 working days after dispatch.${evidenceNote}`
        : country === BRAZIL
          ? `AYN lists Standard / 4PX at about 15–30 calendar days for Brazil after dispatch.${evidenceNote}`
          : `AYN lists Standard / 4PX at about 15–20 calendar days after dispatch.${evidenceNote}`,
    sourceUrl: AYN_SHIPPING_POLICY_URL,
    sampleSize: evidence.sampleSize
  }
}
