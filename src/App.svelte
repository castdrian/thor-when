<script lang="ts">
  import { onMount } from 'svelte'
  import {
    dataset,
    displayConfiguration,
    displayStorage,
    displayTier,
    getColors,
    getStorageVariants,
    getTiers,
    hasConfiguration
  } from './lib/data'
  import { estimateShipment } from './lib/forecast'
  import { formatDate, formatFreshness, formatWindow } from './lib/format'
  import { readInputFromUrl, writeInputToUrl } from './lib/url-state'
  import type {
    Confidence,
    EstimateInput,
    EstimateResult,
    ShippingMethod,
    StorageVariant,
    ThorTier
  } from './lib/types'

  const countries = [
    'United States',
    'Canada',
    'United Kingdom',
    'Germany',
    'France',
    'Netherlands',
    'Australia',
    'New Zealand',
    'Japan',
    'South Korea',
    'Singapore',
    'Brazil',
    'Spain',
    'Italy',
    'Sweden',
    'Switzerland',
    'Poland',
    'Ireland',
    'Other'
  ]

  const defaultConfiguration = dataset.configurations[0]
  const urlInput = typeof window === 'undefined' ? {} : readInputFromUrl(window.location.search)
  let form: EstimateInput = {
    color: String(urlInput.color ?? defaultConfiguration.color),
    tier: (urlInput.tier as ThorTier) ?? defaultConfiguration.tier,
    storageVariant:
      (urlInput.storageVariant as StorageVariant) ?? defaultConfiguration.storageVariant,
    orderPrefix: urlInput.orderPrefix ?? '',
    country: urlInput.country ?? 'United States',
    shippingMethod: (urlInput.shippingMethod as ShippingMethod) ?? 'dhl'
  }
  let result: EstimateResult | null = null
  let hasSubmitted = false
  const baseUrl = import.meta.env.BASE_URL

  const colors = getColors(dataset)
  const tiers = getTiers(dataset)
  const storageVariants = getStorageVariants(dataset)

  $: selectedConfigurationIsValid = hasConfiguration(form, dataset)
  $: configurationLabel = selectedConfigurationIsValid
    ? displayConfiguration(form)
    : 'choose a valid combination'
  $: prefixIsValid = /^\d{4}$/.test(String(form.orderPrefix))

  onMount(() => {
    if (prefixIsValid && selectedConfigurationIsValid) {
      result = estimateShipment(form, dataset)
      hasSubmitted = true
    }
  })

  function submitEstimate() {
    hasSubmitted = true
    const query = writeInputToUrl(form)
    if (typeof window !== 'undefined') window.history.replaceState({}, '', query)
    result = estimateShipment(form, dataset)
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
    <div class="topbar-links">
      <a href="https://www.ayntec.com/pages/shipment-dashboard" target="_blank" rel="noreferrer"
        >source dashboard <span aria-hidden="true">↗</span></a
      >
      <a href="https://github.com/sponsors/castdrian" target="_blank" rel="noreferrer"
        >support the project <span aria-hidden="true">↗</span></a
      >
    </div>
  </nav>

  <section class="hero" aria-labelledby="page-title">
    <div class="eyebrow">
      <span class="pulse-dot"></span> live queue reading · updated {formatFreshness(
        dataset.fetchedAt
      )}
    </div>
    <h1 id="page-title">when will your<br /><em>thor</em> arrive?</h1>
    <p class="hero-copy">
      a calm, data-led read on the wait. tell us what you ordered and we’ll turn AYN’s shipment
      batches into a useful window.
    </p>
  </section>

  <section class="estimator-layout" aria-label="thor shipping estimator">
    <form class="glass-card form-card" on:submit|preventDefault={submitEstimate}>
      <div class="card-kicker"><span>01</span> your configuration</div>
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
          <select bind:value={form.tier} aria-label="Thor tier">
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
          this exact color, tier, and storage combination is not in the latest dashboard
        {/if}
      </div>

      <div class="card-kicker second-kicker"><span>02</span> your order signal</div>
      <label class="prefix-field">
        <span>four digits before the xx</span>
        <div class="prefix-input-wrap">
          <input
            bind:value={form.orderPrefix}
            inputmode="numeric"
            maxlength="4"
            placeholder="2500"
            aria-describedby="prefix-help"
            aria-invalid={hasSubmitted && !prefixIsValid}
          />
          <span aria-hidden="true">xx</span>
        </div>
        <small id="prefix-help"
          >your order may look like 2500xx. we use the four visible digits as a 100-order bucket.</small
        >
      </label>

      <div class="card-kicker second-kicker"><span>03</span> your route</div>
      <div class="field-grid route-grid">
        <label>
          <span>destination</span>
          <select bind:value={form.country} aria-label="Destination country">
            {#each countries as country (country)}
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
        <p class="form-error" role="alert">choose a configuration shown in the latest dashboard.</p>
      {/if}
    </form>

    <div class="result-column">
      {#if result?.ok}
        <section class="glass-card result-card" aria-live="polite" aria-labelledby="result-title">
          <div class="result-heading-row">
            <div>
              <div class="card-kicker">
                <span>result</span>
                {statusLabel(result.dispatch.status)}
              </div>
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
            <div><span>frontier read</span><strong>{result.dispatch.frontierPrefix}xx</strong></div>
            <div><span>signal</span><strong>{result.dispatch.observations} batches</strong></div>
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
            <a class="quiet-button" href={result.dataset.sourceUrl} target="_blank" rel="noreferrer"
              >verify at AYN <span aria-hidden="true">↗</span></a
            >
          </div>
        </section>
      {:else if result && !result.ok}
        <section class="glass-card result-card empty-result" aria-live="polite" role="alert">
          <span class="empty-icon" aria-hidden="true">∿</span>
          <h2>we need one more signal</h2>
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
            <span>observed batches</span><strong>{dataset.records.length}</strong><span
              >source through</span
            ><strong>{formatDate(dataset.sourceLatestDate)}</strong>
          </div>
        </section>
      {/if}

      <div class="method-note">
        <span class="method-mark">i</span>
        <p>
          <strong>how we read it.</strong> AYN publishes ranges, not individual order promises. thor when?
          models the moving frontier and shows a range around it. arrival adds AYN’s published carrier
          transit window; customs and holidays can still move the real date.
        </p>
      </div>
    </div>
  </section>

  <footer class="site-footer">
    <div class="footer-brand"><span class="wordmark-dot"></span><span>thor when?</span></div>
    <p>an unofficial estimate for people waiting on their thor.</p>
    <div class="footer-links">
      <a
        class="donate-button"
        href="https://github.com/sponsors/castdrian"
        target="_blank"
        rel="noopener noreferrer">donate <span aria-hidden="true">♥</span></a
      >
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
    </div>
    <p class="footer-fineprint">
      data refreshes every six hours when the source is available · no tracking · built with
      patience
    </p>
  </footer>
</main>
