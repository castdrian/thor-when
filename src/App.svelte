<script lang="ts">
  import { onMount } from 'svelte'
  import {
    dataset,
    displayConfiguration,
    displayStorage,
    displayTier,
    getColors,
    getConfigurations,
    getStorageVariants,
    getTiers,
    hasConfiguration,
    isDatasetStale
  } from './lib/data'
  import { estimateShipment } from './lib/forecast'
  import { formatDate, formatFreshness, formatWindow } from './lib/format'
  import {
    readInputFromUrl,
    SUPPORTED_COUNTRIES,
    writeInputToUrl
  } from './lib/url-state'
  import type {
    CommunityReport,
    Confidence,
    EstimateInput,
    EstimateResult,
    ShipmentDataset,
    ShippingMethod,
    StorageVariant,
    ThorTier
  } from './lib/types'

  const defaultConfiguration = getConfigurations(dataset)[0] ?? {
    color: '',
    tier: 'max' as const,
    storageVariant: '1tb' as const
  }
  const urlInput = typeof window === 'undefined' ? {} : readInputFromUrl(window.location.search)
  let form: EstimateInput = {
    color: String(urlInput.color ?? defaultConfiguration.color),
    tier: (urlInput.tier as ThorTier) ?? defaultConfiguration.tier,
    storageVariant:
      (urlInput.storageVariant as StorageVariant) ?? defaultConfiguration.storageVariant,
    orderPrefix: urlInput.orderPrefix ?? '',
    country: urlInput.country ?? 'South Korea',
    shippingMethod: (urlInput.shippingMethod as ShippingMethod) ?? 'standard'
  }
  let reportForm: EstimateInput = {
    color: form.color,
    tier: form.tier,
    storageVariant: form.storageVariant,
    orderPrefix: '',
    country: 'South Korea',
    shippingMethod: 'standard'
  }
  let liveDataset: ShipmentDataset = dataset
  let result: EstimateResult | null = null
  let hasSubmitted = false
  let theme: 'light' | 'dark' =
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
      ? 'dark'
      : 'light'
  let reportDispatchDate = ''
  let reportArrivalDate = ''
  let reportConsent = false
  let reportSubmitting = false
  let reportNotice = ''
  const baseUrl = import.meta.env.BASE_URL
  const today = new Date().toISOString().slice(0, 10)

  const colors = getColors(dataset)
  const tiers = getTiers(dataset)
  let storageVariants = getStorageVariants(form.tier, liveDataset)
  let reportStorageVariants = getStorageVariants(reportForm.tier, liveDataset)

  $: selectedConfigurationIsValid = hasConfiguration(form, liveDataset)
  $: configurationLabel = selectedConfigurationIsValid
    ? displayConfiguration(form)
    : 'choose a valid combination'
  $: prefixIsValid = /^\d{4}$/.test(String(form.orderPrefix))
  $: prefixHasError = String(form.orderPrefix).length > 0 && !prefixIsValid
  $: datasetAvailable = liveDataset.records.length > 0 && liveDataset.configurations.length > 0
  $: datasetIsStale = isDatasetStale(liveDataset)
  $: reportSelectedConfigurationIsValid = hasConfiguration(reportForm, liveDataset)
  $: reportConfigurationLabel = reportSelectedConfigurationIsValid
    ? displayConfiguration(reportForm)
    : 'choose a valid combination'
  $: reportPrefixIsValid = /^\d{4}$/.test(String(reportForm.orderPrefix))
  $: reportPrefixHasError = String(reportForm.orderPrefix).length > 0 && !reportPrefixIsValid

  function handleTierChange() {
    storageVariants = getStorageVariants(form.tier, liveDataset)
    if (!storageVariants.includes(form.storageVariant)) {
      form = { ...form, storageVariant: storageVariants[0] ?? form.storageVariant }
    }
  }

  function handleReportTierChange() {
    reportStorageVariants = getStorageVariants(reportForm.tier, liveDataset)
    if (!reportStorageVariants.includes(reportForm.storageVariant)) {
      reportForm = {
        ...reportForm,
        storageVariant: reportStorageVariants[0] ?? reportForm.storageVariant
      }
    }
  }

  function applyTheme(nextTheme: 'light' | 'dark', persist = false) {
    theme = nextTheme
    if (typeof document !== 'undefined') document.documentElement.dataset.theme = nextTheme
    if (persist && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('thor-when-theme', nextTheme)
      } catch {
        return
      }
    }
  }

  function toggleTheme() {
    applyTheme(theme === 'dark' ? 'light' : 'dark', true)
  }

  function mergeCommunityReports(reports: CommunityReport[]) {
    const byId = new Map((liveDataset.communityReports ?? []).map((report) => [report.id, report]))
    for (const report of reports) byId.set(report.id, report)
    liveDataset = { ...liveDataset, communityReports: [...byId.values()] }
    storageVariants = getStorageVariants(form.tier, liveDataset)
    reportStorageVariants = getStorageVariants(reportForm.tier, liveDataset)
    if (prefixIsValid && selectedConfigurationIsValid) result = estimateShipment(form, liveDataset)
  }

  async function loadCommunityReports() {
    if (typeof fetch === 'undefined' || import.meta.env.MODE === 'test') return
    try {
      const response = await fetch('/api/reports', { headers: { accept: 'application/json' } })
      if (!response.ok) return
      const payload = (await response.json()) as { reports?: CommunityReport[] }
      if (Array.isArray(payload.reports)) mergeCommunityReports(payload.reports)
    } catch {
      return
    }
  }

  onMount(() => {
    let savedTheme = ''
    try {
      savedTheme = window.localStorage.getItem('thor-when-theme') ?? ''
    } catch {
      savedTheme = ''
    }
    const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    applyTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : systemTheme)
    handleTierChange()
    handleReportTierChange()
    if (prefixIsValid && selectedConfigurationIsValid) {
      result = estimateShipment(form, liveDataset)
      hasSubmitted = true
    }
    void loadCommunityReports()
    if (import.meta.env.MODE === 'test') return
    const pollId = window.setInterval(() => void loadCommunityReports(), 60_000)
    return () => window.clearInterval(pollId)
  })

  function submitEstimate() {
    hasSubmitted = true
    const query = writeInputToUrl(form)
    if (typeof window !== 'undefined') window.history.replaceState({}, '', query)
    result = estimateShipment(form, liveDataset)
  }

  async function submitShippingReport() {
    if (
      !reportPrefixIsValid ||
      !reportSelectedConfigurationIsValid ||
      !reportDispatchDate ||
      !reportConsent
    ) {
      reportNotice =
        'choose the model, enter the first four digits, add a dispatch date, and confirm the privacy note.'
      return
    }
    if (typeof fetch === 'undefined') {
      reportNotice = 'live reporting is unavailable in this browser.'
      return
    }
    reportSubmitting = true
    reportNotice = ''
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          color: reportForm.color,
          tier: reportForm.tier,
          storageVariant: reportForm.storageVariant,
          orderPrefix: reportForm.orderPrefix,
          country: reportForm.country,
          shippingMethod: reportForm.shippingMethod,
          dispatchedOn: reportDispatchDate,
          deliveredOn: reportArrivalDate || null,
          consent: true
        })
      })
      const payload = (await response.json()) as { report?: CommunityReport; error?: string }
      if (!response.ok || !payload.report) {
        reportNotice = payload.error ?? 'the report could not be saved right now.'
        return
      }
      mergeCommunityReports([payload.report])
      reportDispatchDate = ''
      reportArrivalDate = ''
      reportConsent = false
      reportNotice = 'saved — this outcome is included in the live model now.'
    } catch {
      reportNotice = 'the live report service is unavailable. try again in a moment.'
    } finally {
      reportSubmitting = false
    }
  }

  function confidenceLabel(confidence: Confidence): string {
    return confidence === 'high'
      ? 'high confidence'
      : confidence === 'medium'
        ? 'medium confidence'
        : 'low confidence'
  }

  function statusLabel(status: string): string {
    if (status === 'observed') return 'published batch'
    if (status === 'inferred') return 'frontier passed'
    if (status === 'insufficient') return 'limited history'
    return 'forecast'
  }

  function resultTitle(status: string): string {
    if (status === 'observed') return 'your batch is on the move'
    if (status === 'inferred') return 'your bucket is probably past the frontier'
    if (status === 'insufficient') return 'a softer signal, for now'
    return 'here’s the best read right now'
  }
</script>

<svelte:head>
  <meta name="theme-color" content={theme === 'dark' ? '#0b1220' : '#e5e2dc'} />
  <meta property="og:title" content="thor when?" />
  <meta property="og:description" content="see when your ayn thor will probably ship and arrive." />
  <meta name="twitter:title" content="thor when?" />
  <meta
    name="twitter:description"
    content="see when your ayn thor will probably ship and arrive."
  />
</svelte:head>

<main class="page-shell">
  <div class="ambient-orb orb-a"></div>
  <div class="ambient-orb orb-b"></div>
  <div class="grain"></div>

  <nav class="topbar" aria-label="primary navigation">
    <a class="wordmark" href={baseUrl} aria-label="thor when? home">
      <span class="wordmark-dot"></span>
      <span>thor when?</span>
    </a>
    <div class="topbar-actions">
      <div class="topbar-links">
        <a
          href="https://www.ayntec.com/pages/shipment-dashboard"
          target="_blank"
          rel="noopener noreferrer"
          >source dashboard <span aria-hidden="true">↗</span></a
        >
        <a
          class="donate-button"
          href="https://github.com/sponsors/castdrian"
          target="_blank"
          rel="noopener noreferrer"
          >donate <span aria-hidden="true">♥</span></a
        >
      </div>
      <button
        class="theme-toggle"
        type="button"
        aria-pressed={theme === 'dark'}
        aria-label={theme === 'dark' ? 'switch to light mode' : 'switch to dark mode'}
        on:click={toggleTheme}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☼' : '◐'}</span>
        <span>{theme === 'dark' ? 'light' : 'dark'}</span>
      </button>
    </div>
  </nav>

  <section class="hero" aria-labelledby="page-title">
    <div class="eyebrow">
      <span class="pulse-dot"></span>
      {#if !datasetAvailable}
        shipment source unavailable
      {:else if datasetIsStale}
        source may be stale · refreshed {formatFreshness(liveDataset.fetchedAt)}
      {:else}
        live queue reading · updated {formatFreshness(liveDataset.fetchedAt)}
      {/if}
    </div>
    {#if datasetIsStale || !datasetAvailable}
      <p class="data-status" role="status">
        {#if datasetAvailable}
          AYN has not published a recent shipment frontier. Estimates may be less useful until the
          source moves again.
        {:else}
          the latest AYN shipment data could not be loaded, so no estimate is available yet.
        {/if}
      </p>
    {/if}
    <h1 id="page-title">when will your<br /><em>thor</em> arrive?</h1>
    <p class="hero-copy">
      a calm, data-led read on the wait. tell us what you ordered and we’ll turn AYN’s shipment
      batches into a useful window.
    </p>
  </section>

  <section class="estimator-layout" aria-label="thor shipping estimator">
    <form class="glass-card form-card" on:submit|preventDefault={submitEstimate}>
      <div class="card-kicker">your configuration</div>
      <div class="field-grid">
        <label>
          <span>color</span>
          <select bind:value={form.color} aria-label="Thor color">
            {#each colors as color (color)}
              <option value={color}>{color}</option>
            {/each}
          </select>
        </label>
        <label>
          <span>tier</span>
          <select bind:value={form.tier} aria-label="Thor tier" on:change={handleTierChange}>
            {#each tiers as tier (tier)}
              <option value={tier}>{displayTier(tier)}</option>
            {/each}
          </select>
        </label>
        <label>
          <span>storage</span>
          <select bind:value={form.storageVariant} aria-label="Thor storage">
            {#each storageVariants as storage (storage)}
              <option value={storage}>{displayStorage(storage)}</option>
            {/each}
          </select>
        </label>
      </div>
      <div
        class:invalid={!selectedConfigurationIsValid}
        class="configuration-note"
        aria-live="polite"
      >
        <span class="configuration-swatch"></span>
        {#if selectedConfigurationIsValid}
          {configurationLabel}
        {:else}
          choose one of the real Thor variants
        {/if}
      </div>

      <div class="card-kicker second-kicker">your order signal</div>
      <label class="prefix-field">
        <span>first four digits of your order number</span>
        <div class="prefix-input-wrap">
          <input
            bind:value={form.orderPrefix}
            inputmode="numeric"
            maxlength="4"
            placeholder="2500"
            aria-label="First four digits of your order number"
            aria-describedby={prefixHasError ? 'prefix-help prefix-error' : 'prefix-help'}
            aria-invalid={prefixHasError}
          />
        </div>
        <small id="prefix-help"
          >for example, 2500. we use these four digits as a 100-order bucket.</small
        >
        {#if prefixHasError}
          <small class="field-error" id="prefix-error">enter exactly four digits.</small>
        {/if}
      </label>

      <div class="card-kicker second-kicker">your route</div>
      <div class="field-grid route-grid">
        <label>
          <span>destination</span>
          <select bind:value={form.country} aria-label="Destination country">
            {#each SUPPORTED_COUNTRIES as country (country)}
              <option value={country}>{country}</option>
            {/each}
          </select>
        </label>
        <label>
          <span>shipping method</span>
          <select bind:value={form.shippingMethod} aria-label="Shipping method">
            <option value="dhl">DHL</option>
            <option value="standard">Standard / 4PX</option>
          </select>
        </label>
      </div>

      <button
        class="primary-button"
        type="submit"
        disabled={!selectedConfigurationIsValid || !prefixIsValid}
      >
        <span>show my window</span>
        <span class="button-arrow" aria-hidden="true">↗</span>
      </button>
      {#if hasSubmitted && !prefixIsValid}
        <p class="form-error" role="alert">please enter exactly four digits.</p>
      {:else if hasSubmitted && !selectedConfigurationIsValid}
        <p class="form-error" role="alert">choose one of AYN’s Thor variants.</p>
      {/if}
    </form>

    <div class="result-column">
      {#if result?.ok}
        <section class="glass-card result-card" aria-live="polite" aria-labelledby="result-title">
          <div class="result-heading-row">
            <div>
              <div class="card-kicker">result · {statusLabel(result.dispatch.status)}</div>
              <h2 id="result-title">{resultTitle(result.dispatch.status)}</h2>
            </div>
            <span
              class:low={result.dispatch.confidence === 'low'}
              class:medium={result.dispatch.confidence === 'medium'}
              class="confidence-pill">{confidenceLabel(result.dispatch.confidence)}</span
            >
          </div>

          <div class="date-hero">
            <span>most likely dispatch</span>
            <strong>{formatDate(result.dispatch.likelyDate)}</strong>
            <small
              >{result.dispatch.window.start === result.dispatch.window.end
                ? 'published on this batch date'
                : `likely between ${formatWindow(result.dispatch.window.start, result.dispatch.window.end)}`}</small
            >
          </div>

          <div class="arrival-panel">
            <div>
              <span class="arrival-label">estimated arrival</span>
              <strong>{formatWindow(result.arrival.window.start, result.arrival.window.end)}</strong
              >
            </div>
            <span class="route-chip">{result.arrival.methodLabel} · {result.input.country}</span>
          </div>

          <div class="result-detail-grid">
            <div><span>frontier read</span><strong>{result.dispatch.frontierPrefix}</strong></div>
            <div>
              <span>signal</span><strong
                >{result.dispatch.observations
                  ? `${result.dispatch.observations} batches`
                  : 'pooled history'}</strong
              ></div
            >
            <div><span>model</span><strong>{result.dispatch.model}</strong></div>
          </div>
          <p class="result-explanation">
            {result.dispatch.explanation}
            {result.arrival.explanation}
          </p>
          <div class="result-actions">
            <button
              class="quiet-button"
              type="button"
              on:click={() => navigator.clipboard?.writeText(window.location.href)}
              >copy share link <span aria-hidden="true">↗</span></button
            >
            <a
              class="quiet-button"
              href={result.dataset.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              >verify at AYN <span aria-hidden="true">↗</span></a
            >
            <a
              class="quiet-button"
              href={result.arrival.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              >shipping time source <span aria-hidden="true">↗</span></a
            >
          </div>
        </section>
      {:else if result && !result.ok}
        <section class="glass-card result-card empty-result" aria-live="polite" role="alert">
          <span class="empty-icon" aria-hidden="true">∿</span>
          <h2>{result.code === 'no-data' ? 'the source is taking a pause' : 'we need one more signal'}</h2>
          <p>{result.message}</p>
        </section>
      {:else}
        <section class="glass-card result-card empty-result" aria-label="estimate preview">
          <div class="empty-rings" aria-hidden="true"><span></span><span></span><span></span></div>
          <h2>your answer will live here</h2>
          <p>
            fill the quiet little form and we’ll show the dispatch signal, the confidence, and the
            route home.
          </p>
          <div class="empty-meta">
            {#if datasetAvailable}
              <span>observed batches</span><strong>{liveDataset.records.length}</strong><span
                >source through</span
              ><strong>{formatDate(liveDataset.sourceLatestDate)}</strong>
            {:else}
              <span>source status</span><strong>unavailable</strong>
            {/if}
          </div>
        </section>
      {/if}

      <div class="method-note">
        <span class="method-mark">i</span>
        <p>
          <strong>how we read it.</strong> AYN publishes ranges, not individual order promises. thor when?
          tracks the moving frontier, tests two pace guesses against past batches, and wraps the better
          guess in a window based on its past misses. arrival uses AYN’s carrier transit windows; customs
          and holidays can still move the real date.
        </p>
      </div>
    </div>
  </section>

  <section class="report-card glass-card" aria-labelledby="report-title">
    <div class="card-kicker">improve the next read</div>
    <div class="report-layout">
      <div>
        <h2 id="report-title">when yours ships, tell the next person.</h2>
        <p>
          choose the Thor model and route here, then share the real dispatch or arrival milestone.
          It is stored without names or addresses and is included in the live model as soon as it is
          accepted.
        </p>
        <p class="report-safety">
          never include a name, address, email, tracking number, or order link.
        </p>
      </div>
      <form class="report-form" on:submit|preventDefault={submitShippingReport}>
        <div class="report-field-grid">
          <label>
            <span>color</span>
            <select bind:value={reportForm.color} aria-label="Report Thor color">
              {#each colors as color (color)}
                <option value={color}>{color}</option>
              {/each}
            </select>
          </label>
          <label>
            <span>tier</span>
            <select
              bind:value={reportForm.tier}
              aria-label="Report Thor tier"
              on:change={handleReportTierChange}
            >
              {#each tiers as tier (tier)}
                <option value={tier}>{displayTier(tier)}</option>
              {/each}
            </select>
          </label>
          <label>
            <span>storage</span>
            <select bind:value={reportForm.storageVariant} aria-label="Report Thor storage">
              {#each reportStorageVariants as storage (storage)}
                <option value={storage}>{displayStorage(storage)}</option>
              {/each}
            </select>
          </label>
        </div>
        <div class="report-summary">
          <span>reporting</span>
          <strong>{reportConfigurationLabel}</strong>
        </div>
        <label class="prefix-field">
          <span>first four digits of the order number</span>
          <input
            bind:value={reportForm.orderPrefix}
            inputmode="numeric"
            maxlength="4"
            placeholder="2500"
            aria-label="Report order number first four digits"
            aria-describedby={reportPrefixHasError ? 'report-prefix-help report-prefix-error' : 'report-prefix-help'}
            aria-invalid={reportPrefixHasError}
          />
          <small id="report-prefix-help">these four digits identify the 100-order bucket.</small>
          {#if reportPrefixHasError}
            <small class="field-error" id="report-prefix-error">enter exactly four digits.</small>
          {/if}
        </label>
        <div class="report-route-grid">
          <label>
            <span>destination</span>
            <select bind:value={reportForm.country} aria-label="Report destination country">
              {#each SUPPORTED_COUNTRIES as country (country)}
                <option value={country}>{country}</option>
              {/each}
            </select>
          </label>
          <label>
            <span>shipping method</span>
            <select bind:value={reportForm.shippingMethod} aria-label="Report shipping method">
              <option value="dhl">DHL</option>
              <option value="standard">Standard / 4PX</option>
            </select>
          </label>
        </div>
        <div class="report-date-grid">
          <label>
            <span>actual dispatch date</span>
            <input bind:value={reportDispatchDate} type="date" max={today} required />
          </label>
          <label>
            <span>actual arrival date</span>
            <input
              bind:value={reportArrivalDate}
              type="date"
              min={reportDispatchDate || undefined}
              max={today}
            />
          </label>
        </div>
        <label class="consent-row">
          <input bind:checked={reportConsent} type="checkbox" />
          <span>I’m sharing an actual outcome and agree that it can improve future estimates.</span>
        </label>
        <button
          class="primary-button report-button"
          type="submit"
          disabled={
            reportSubmitting ||
            !reportPrefixIsValid ||
            !reportSelectedConfigurationIsValid ||
            !reportDispatchDate ||
            !reportConsent
          }
        >
          <span>{reportSubmitting ? 'saving report…' : 'save shipping report'}</span>
          <span class="button-arrow" aria-hidden="true">↗</span>
        </button>
        {#if reportNotice}
          <p class="report-notice" role="status">{reportNotice}</p>
        {/if}
      </form>
    </div>
  </section>

  <footer class="site-footer">
    <div class="footer-brand"><span class="wordmark-dot"></span><span>thor when?</span></div>
    <p>an unofficial estimate for people waiting on their thor.</p>
    <div class="footer-links">
      <a href="https://ko-fi.com/castdrian" target="_blank" rel="noopener noreferrer"
        >ko-fi <span aria-hidden="true">↗</span></a
      >
      <a href="https://github.com/castdrian/thor-when" target="_blank" rel="noopener noreferrer"
        >source <span aria-hidden="true">↗</span></a
      >
      <a
        href="https://www.ayntec.com/pages/shipment-dashboard"
        target="_blank"
        rel="noopener noreferrer">AYN dashboard <span aria-hidden="true">↗</span></a
      >
      <a
        href="https://www.ayntec.com/products/ayn-thor"
        target="_blank"
        rel="noopener noreferrer">Thor variants <span aria-hidden="true">↗</span></a
      >
      <a
        href="https://www.ayntec.com/policies/shipping-policy"
        target="_blank"
        rel="noopener noreferrer">shipping policy <span aria-hidden="true">↗</span></a
      >
      <a
        href="https://github.com/castdrian/thor-when#methodology"
        target="_blank"
        rel="noopener noreferrer"
        >methodology <span aria-hidden="true">↗</span></a
      >
      <a
        href="https://github.com/castdrian/thor-when#privacy"
        target="_blank"
        rel="noopener noreferrer"
        >privacy <span aria-hidden="true">↗</span></a
      >
      <a
        href="https://github.com/castdrian/thor-when#disclaimer"
        target="_blank"
        rel="noopener noreferrer"
        >disclaimer <span aria-hidden="true">↗</span></a
      >
    </div>
    <p class="footer-fineprint">
      AYN refreshes every six hours · community reports update instantly · no tracking · built with
      patience
    </p>
  </footer>
</main>
