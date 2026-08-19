# thor when?

thor when? turns AYN’s public shipment dashboard into an unofficial dispatch and arrival estimate for your Thor order.

## what it does

Choose your Thor color, tier, storage, destination, and shipping method. Every current AYN variant is available in the guided form: Lite 8+128GB, Base 8+128GB, Pro 12+256GB, Max 16+512GB, and Max 16+1TB. Enter the first four digits of your order number. The app treats those digits as a 100-order bucket, then reports the latest configuration-specific shipment frontier, a likely dispatch date and window, and a separate arrival window.

The form defaults to South Korea and 4PX, while still letting a visitor choose any supported route. The interface starts with the operating system’s light or dark preference. The theme button saves an explicit choice for future visits.

AYN’s [Thor product page](https://www.ayntec.com/products/ayn-thor) defines the current variants and AYN’s [shipping policy](https://www.ayntec.com/policies/shipping-policy) lists DHL at about 3–7 working days after dispatch, Standard / 4PX at about 15–20 calendar days, and Standard / 4PX to Brazil at about 15–30 calendar days. The app converts those sourced ranges into weekday-aware arrival bounds. Customs, holidays, remote-area delays, and carrier disruptions are outside the model.

## how the estimate works

The numbers are deliberately turned into a few plain-language steps:

1. A refresh reads AYN’s dated ranges and records the highest order bucket reached for each color and model on each date. That creates a moving frontier rather than pretending every order has its own published date.
2. If your bucket is inside a published range, the app shows that observed batch. If it is below the latest frontier but absent from a row, it says it probably already passed. If it is ahead, the app estimates when the frontier may cross it.
3. For a future crossing, two simple pace guesses are tested against older dashboard dates: a recent median batch pace and a robust trend that is less affected by one unusual batch. The guess with the smaller average miss in those historical tests wins. If a color queue is too sparse, the app pools the same tier and storage history and lowers confidence.
4. The date is wrapped in a window. The window is made from the historical misses of those backtests, widened when there is little history or a long way to extrapolate. It never starts before the latest source observation.
5. Transit is added separately using AYN’s carrier policy. Real delivery reports only adjust this transit part after at least three matching, date-validated outcomes, so one anecdote cannot swing the result. Each accepted report is also added to the current browser session immediately.

In other words, the algorithm is a measured “how fast has this queue been moving lately?” calculation with a safety margin based on how wrong similar past guesses were. It is not a promise and it does not need a visitor’s address or tracking number.

Share links use a compact, checksummed token containing the guided selections and four-digit order prefix. They stay short without a server-side lookup and still restore the form exactly when opened.

## live reports and storage

The app is hosted as a Cloudflare Worker with Workers Static Assets. The Worker serves the fast Svelte shell and handles `/api/reports` on the same origin. Reports are validated at the edge, then stored in a private Cloudflare D1 SQLite database containing only the selected model, four-digit bucket, country, carrier, dates, and an anonymous generated id. No name, email, address, tracking number, IP address, or analytics identifier is stored.

After a successful submission the API returns the accepted report, the browser merges it into its in-memory dataset, and the estimate recalculates without a reload. A six-hour GitHub Actions refresh fetches the AYN dashboard, runs all checks, applies D1 migrations, and deploys the Worker. If the source fetch fails, the workflow stops before deployment so the previous live Worker remains in place.

## local development

```text
bun install
bun run dev
```

Bun is the supported package manager and runtime. Node 22 is pinned in `.nvmrc` only for ecosystem tooling that requires Node-compatible APIs.

To exercise the Worker and local D1 binding:

```text
bun run db:migrate -- --local
bun run dev:worker
```

Useful checks:

```text
bun run fetch-data
bun run format:check
bun run lint
bun run check
bun run test
bun run test:e2e
bun run build
```

## privacy

thor when? stores no analytics, cookies, addresses, tracking numbers, or personal identifiers. The four-digit bucket stays in the shareable URL only when you choose to copy or bookmark it. Shipping reports contain only the selected model, bucket, destination country, carrier, and dispatch or arrival dates. Accepted reports are validated and used as aggregate timing evidence; never submit personal information.

## disclaimer

This is an unofficial estimate, not an AYN shipping promise. The dashboard, customs, holidays, remote-area delays, and carrier disruptions can change the outcome. Check AYN’s [shipping policy](https://www.ayntec.com/policies/shipping-policy) and contact AYN for an authoritative update.

## support

If thor when? helped you, support the project through [GitHub Sponsors](https://github.com/sponsors/castdrian) or [Ko-fi](https://ko-fi.com/castdrian).

## source

- [AYN shipment dashboard](https://www.ayntec.com/pages/shipment-dashboard)
- [AYN Thor product variants](https://www.ayntec.com/products/ayn-thor)
- [AYN shipping policy](https://www.ayntec.com/policies/shipping-policy)
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)

## license

MIT. See [LICENSE](LICENSE).
