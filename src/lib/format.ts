export function formatDate(isoDate: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
    ...options
  }).format(new Date(`${isoDate}T00:00:00Z`))
}

export function formatWindow(start: string, end: string): string {
  return start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`
}

export function formatFreshness(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC'
  }).format(new Date(isoDate))
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase())
}
