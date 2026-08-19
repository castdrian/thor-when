import { describe, expect, it } from 'vitest'
import { parseCommunityReport } from '../scripts/fetch-community-reports'

const issue = {
  number: 42,
  html_url: 'https://github.com/castdrian/thor-when/issues/42',
  updated_at: '2026-08-19T12:00:00.000Z',
  body: `Thor color: Black
Thor tier: max
Thor storage: 1TB
Order bucket: 2500
Destination country: United States
Shipping method: dhl
Dispatch date: 2026-08-10
Arrival date: 2026-08-17
Consent: yes`
}

describe('community shipping reports', () => {
  it('accepts a complete privacy-safe outcome', () => {
    expect(parseCommunityReport(issue, new Date('2026-08-19T12:00:00.000Z'))).toMatchObject({
      issueNumber: 42,
      tier: 'max',
      storageVariant: '1tb',
      orderPrefix: 2500,
      dispatchedOn: '2026-08-10',
      deliveredOn: '2026-08-17'
    })
  })

  it('rejects incomplete, future, or unconsented reports', () => {
    expect(
      parseCommunityReport(
        { ...issue, body: issue.body.replace('Consent: yes', 'Consent: no') },
        new Date('2026-08-19T12:00:00.000Z')
      )
    ).toBeNull()
    expect(
      parseCommunityReport(
        {
          ...issue,
          body: issue.body.replace('Dispatch date: 2026-08-10', 'Dispatch date: 2026-09-10')
        },
        new Date('2026-08-19T12:00:00.000Z')
      )
    ).toBeNull()
  })
})
