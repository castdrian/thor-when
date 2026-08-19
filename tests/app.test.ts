import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../src/App.svelte'

describe('thor when app', () => {
  afterEach(() => cleanup())

  it('renders the lowercase brand and funding links', () => {
    render(App)
    expect(screen.getAllByText('thor when?').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /donate/i })).toHaveAttribute(
      'href',
      'https://github.com/sponsors/castdrian'
    )
    expect(screen.getByRole('link', { name: /ko-fi/i })).toHaveAttribute(
      'href',
      'https://ko-fi.com/castdrian'
    )
    expect(screen.getByRole('link', { name: /donate/i })).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    )
    expect(screen.getByRole('link', { name: /methodology/i })).toHaveAttribute(
      'href',
      'https://github.com/castdrian/thor-when#methodology'
    )
  })

  it('shows a result after entering a valid signal', async () => {
    render(App)
    const input = screen.getByRole('textbox', { name: /four digits/i })
    await fireEvent.input(input, { target: { value: '2500' } })
    await fireEvent.click(screen.getByRole('button', { name: /show my window/i }))
    expect(await screen.findByText(/most likely dispatch/i)).toBeInTheDocument()
  })

  it('announces an invalid prefix before the submit action is available', async () => {
    render(App)
    const input = screen.getByRole('textbox', { name: /four digits/i })
    await fireEvent.input(input, { target: { value: '25' } })
    expect(screen.getByText('enter exactly four digits.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show my window/i })).toBeDisabled()
  })
})
