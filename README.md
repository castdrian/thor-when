# thor when?

thor when? turns AYN’s public shipment dashboard into an unofficial dispatch and arrival estimate for your Thor order.

## what it does

Choose your Thor color, tier, storage, destination, and shipping method. Every current AYN variant is available in the guided form: Lite 8+128GB, Base 8+128GB, Pro 12+256GB, Max 16+512GB, and Max 16+1TB. Enter the four digits before the `xx` in your order number. The app reports the latest configuration-specific shipment frontier, a likely dispatch date and window, and a separate arrival window.

The interface starts with your operating system’s light or dark preference. The theme button lets you save an explicit choice for future visits.

AYN publishes ranges rather than individual order promises. The estimator uses observed frontier movement, robust trend and batch-pace candidates, rolling backtests, and residual-based uncertainty windows. It reports uncertainty explicitly and never represents a forecast as an AYN guarantee.

AYN’s [Thor product page](https://www.ayntec.com/products/ayn-thor) defines the current variants and AYN’s [shipping policy](https://www.ayntec.com/policies/shipping-policy) lists DHL at about 3–7 working days after dispatch, Standard / 4PX at about 15–20 calendar days, and Standard / 4PX to Brazil at about 15–30 calendar days. The app converts those sourced ranges into weekday-aware arrival bounds. Customs, holidays, remote-area delays, and carrier disruptions are outside the model.

## local development

```text
bun install
bun run dev
```

Bun is the supported package manager and runtime. Node 22 is pinned in `.nvmrc` only for ecosystem tooling that requires Node-compatible APIs.

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

## deployment

The repository deploys to [thor-when.dylib.dev](https://thor-when.dylib.dev/) through GitHub Pages and `.github/workflows/deploy.yml` on pushes to `main`, manual dispatches, shipping-report issue events, and a six-hour schedule. Each refresh fetches AYN’s dashboard and validated community reports, builds the static app, and deploys the Pages artifact. A source failure leaves the previous deployment untouched.

GitHub Pages must use GitHub Actions as its publishing source. Project Pages builds use `/thor-when/` as the asset base; a custom domain can use `/` by changing the Vite base configuration and setting `VITE_SITE_URL` to the public origin.

The static HTML includes lowercase `thor when?` Open Graph and Twitter metadata plus a 1200×630 PNG preview card for link embeds.

## methodology

The estimator turns dated AYN ranges into a monotonic configuration frontier. Exact ranges are reported as observed, gaps behind the frontier are inferred as probably shipped, and future buckets use the better recent batch-pace or Theil–Sen trend after rolling-origin error checks. A pooled tier and storage fallback is used when a color queue has too little progressing history, so a valid variant can still receive a forecast before its own label appears on the dashboard. Transit is added from AYN’s published carrier windows.

## privacy

thor when? stores no analytics, cookies, addresses, or tracking numbers. The four-digit bucket stays in the shareable URL only when you choose to copy or bookmark it. Optional shipping reports open as public GitHub issues and include only the selected variant, bucket, destination country, carrier, and dispatch or arrival dates. Accepted reports are validated, stripped of author identity, and used as aggregate timing evidence; never submit personal information.

## disclaimer

This is an unofficial estimate, not an AYN shipping promise. The dashboard, customs, holidays, remote-area delays, and carrier disruptions can change the outcome. Check AYN’s [shipping policy](https://www.ayntec.com/policies/shipping-policy) and contact AYN for an authoritative update.

## support

If thor when? helped you, support the project through [GitHub Sponsors](https://github.com/sponsors/castdrian) or [Ko-fi](https://ko-fi.com/castdrian).

## source

- [AYN shipment dashboard](https://www.ayntec.com/pages/shipment-dashboard)
- [AYN Thor product variants](https://www.ayntec.com/products/ayn-thor)
- [AYN shipping policy](https://www.ayntec.com/policies/shipping-policy)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## license

MIT. See [LICENSE](LICENSE).
