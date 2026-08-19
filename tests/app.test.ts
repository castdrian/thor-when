import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App.svelte'

describe('thor when app', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the lowercase brand and funding links', () => {
    render(App)
    expect(screen.getAllByText('thor when?').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /donate/i })).toHaveAttribute(
      'href',
      'https://github.com/sponsors/castdrian'
    )
    expect(screen.getByRole('link', { name: /donate/i })).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    )
    expect(screen.getByRole('link', { name: /methodology/i })).toHaveAttribute(
      'href',
      'https://github.com/castdrian/thor-when#methodology'
    )
    expect(screen.getAllByRole('option', { name: '1TB' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('option', { name: 'Max' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /save shipping report/i })).toBeDisabled()
  })

  it('offers a dark mode toggle', async () => {
    render(App)
    const toggle = screen.getByRole('button', { name: /switch to dark mode/i })
    await fireEvent.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a result after entering a valid signal', async () => {
    render(App)
    const input = screen.getByRole('textbox', { name: 'First four digits of your order number' })
    await fireEvent.input(input, { target: { value: '2500' } })
    await fireEvent.click(screen.getByRole('button', { name: /show my window/i }))
    expect(await screen.findByText(/most likely dispatch/i)).toBeInTheDocument()
  })

  it('announces an invalid prefix before the submit action is available', async () => {
    render(App)
    const input = screen.getByRole('textbox', { name: 'First four digits of your order number' })
    await fireEvent.input(input, { target: { value: '25' } })
    expect(screen.getByText('enter exactly four digits.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show my window/i })).toBeDisabled()
  })

  it('submits the independent report form to the live API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        report: {
          id: 'live-1',
          submittedAt: '2026-08-19T00:00:00.000Z',
          color: 'Black',
          tier: 'max',
          storageVariant: '1tb',
          orderPrefix: 2500,
          country: 'South Korea',
          shippingMethod: 'standard',
          dispatchedOn: '2026-08-10'
        }
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    render(App)
    await fireEvent.input(
      screen.getByRole('textbox', { name: 'Report order number first four digits' }),
      {
        target: { value: '2500' }
      }
    )
    await fireEvent.input(screen.getByLabelText('actual dispatch date'), {
      target: { value: '2026-08-10' }
    })
    await fireEvent.click(screen.getByRole('checkbox'))
    await fireEvent.click(screen.getByRole('button', { name: /save shipping report/i }))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reports',
      expect.objectContaining({ method: 'POST' })
    )
    expect(await screen.findByRole('status')).toHaveTextContent(/included in the live model/i)
  })
})
