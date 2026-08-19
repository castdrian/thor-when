# thor when?

thor when? turns AYN’s public shipment dashboard into an unofficial dispatch and arrival estimate for your Thor order.

## what it does

Choose your Thor color, tier, storage, destination, and shipping method. Enter the four digits before the `xx` in your order number. The app reports the latest configuration-specific shipment frontier, a likely dispatch date and window, and a separate arrival window.

AYN publishes ranges rather than individual order promises. The estimator uses observed frontier movement, robust trend and batch-pace candidates, rolling backtests, and residual-based uncertainty windows. It reports uncertainty explicitly and never represents a forecast as an AYN guarantee.

AYN lists DHL at about 3–7 working days after dispatch, Standard / 4PX at about 15–20 days, and Standard / 4PX to Brazil at about 15–30 days. Customs, holidays, remote-area delays, and carrier disruptions are outside the model.

## local development

```text
npm install
npm run dev
```

Useful checks:

```text
npm run fetch-data
npm run format:check
npm run lint
npm run check
npm test
npm run build
```

## deployment

The repository deploys to GitHub Pages through `.github/workflows/deploy.yml` on pushes to `main`, manual dispatches, and a six-hour schedule. The scheduled job fetches AYN’s dashboard, validates the source shape and freshness, builds the static app, and deploys the Pages artifact. A source failure leaves the previous deployment untouched.

GitHub Pages must use GitHub Actions as its publishing source. Project Pages builds use `/thor-when/` as the asset base; a custom domain can use `/` by changing the Vite base configuration.

## support

If thor when? helped you, support the project through [GitHub Sponsors](https://github.com/sponsors/castdrian) or [Ko-fi](https://ko-fi.com/castdrian).

## source

- [AYN shipment dashboard](https://www.ayntec.com/pages/shipment-dashboard)
- [AYN shipping policy](https://www.ayntec.com/policies/shipping-policy)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## license

MIT. See [LICENSE](LICENSE).
