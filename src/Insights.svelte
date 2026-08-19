<script lang="ts">
  import { calculateInsights } from './lib/insights'
  import { displayConfiguration } from './lib/data'
  import { formatDate, formatFreshness } from './lib/format'
  import type { ShipmentDataset } from './lib/types'

  export let dataset: ShipmentDataset
  export let homeHref = '/'
  export let theme: 'light' | 'dark' = 'light'
  export let onToggleTheme: () => void = () => undefined

  $: metrics = calculateInsights(dataset)
  $: recentRows = metrics.rows.slice(0, 8)
  $: confidenceRows = [
    { level: 'high' as const, count: metrics.confidence.high },
    { level: 'medium' as const, count: metrics.confidence.medium },
    { level: 'low' as const, count: metrics.confidence.low },
  ]

  function percentage(value: number, total: number): string {
    return total ? `${Math.round((value / total) * 100)}%` : '—'
  }

  function missDays(value: number | null): string {
    return value === null ? '—' : `${value} day${value === 1 ? '' : 's'}`
  }

  function confidencePercentage(value: number): string {
    return metrics.validEstimates ? `${Math.round((value / metrics.validEstimates) * 100)}%` : '0%'
  }

  function reportDate(value: string): string {
    return formatDate(value.slice(0, 10))
  }
</script>

<svelte:head>
  <title>thor when? · insights</title>
  <meta
    name="description"
    content="community report and estimate performance insights for thor when?."
  />
</svelte:head>

<main class="page-shell insights-page">
  <nav class="topbar" aria-label="insights navigation">
    <a class="wordmark" href={homeHref} aria-label="thor when? home">
      <span class="wordmark-dot"></span>
      <span>thor when?</span>
    </a>
    <div class="topbar-actions">
      <div class="topbar-links">
        <a
          class="github-button"
          href="https://github.com/castdrian/thor-when"
          target="_blank"
          rel="noopener noreferrer">github <span aria-hidden="true">↗</span></a
        >
        <a class="insights-back-link" href={homeHref}>estimate <span aria-hidden="true">↗</span></a>
        <a
          class="donate-button"
          href="https://github.com/sponsors/castdrian"
          target="_blank"
          rel="noopener noreferrer">donate <span aria-hidden="true">♥</span></a
        >
      </div>
      <button
        class="theme-toggle"
        type="button"
        aria-pressed={theme === 'dark'}
        aria-label={theme === 'dark' ? 'switch to light mode' : 'switch to dark mode'}
        on:click={onToggleTheme}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☼' : '◐'}</span>
        <span>{theme === 'dark' ? 'light' : 'dark'}</span>
      </button>
    </div>
  </nav>

  <section class="hero insights-hero" aria-labelledby="insights-title">
    <div class="eyebrow"><span class="pulse-dot"></span>community signal</div>
    <h1 id="insights-title">the read<br /><em>behind the read.</em></h1>
    <p class="hero-copy">
      A quiet look at the anonymous shipment reports shaping thor when? — what has been submitted,
      how close the current snapshot lands, and where confidence comes from.
    </p>
  </section>

  <section class="insight-stat-grid" aria-label="community report overview">
    <article class="glass-card insight-stat">
      <span>submissions</span>
      <strong>{metrics.totalSubmissions}</strong>
      <small>accepted anonymous reports</small>
    </article>
    <article class="glass-card insight-stat">
      <span>with arrival date</span>
      <strong>{metrics.deliveredSubmissions}</strong>
      <small>reports with a delivered outcome</small>
    </article>
    <article class="glass-card insight-stat">
      <span>dispatch hit rate</span>
      <strong>{percentage(metrics.dispatchWithinWindow, metrics.dispatchEvaluations)}</strong>
      <small>{metrics.dispatchEvaluations || 'no'} comparable reports</small>
    </article>
    <article class="glass-card insight-stat">
      <span>median dispatch miss</span>
      <strong>{missDays(metrics.medianDispatchMissDays)}</strong>
      <small>absolute distance from the current read</small>
    </article>
  </section>

  <section class="insight-panel-grid" aria-label="model quality details">
    <article class="glass-card insight-panel">
      <div class="card-kicker">confidence mix</div>
      <h2>how much signal is behind each read.</h2>
      <div class="confidence-list">
        {#each confidenceRows as row (row.level)}
          <div class="confidence-row">
            <div class="confidence-row-label">
              <span>{row.level} confidence</span>
              <strong>{row.count}</strong>
            </div>
            <div class="confidence-track">
              <span
                class:high={row.level === 'high'}
                class:medium={row.level === 'medium'}
                class:low={row.level === 'low'}
                style={`width: ${confidencePercentage(row.count)}`}
              ></span>
            </div>
          </div>
        {/each}
      </div>
      <p class="insight-note">
        Confidence comes from the amount and consistency of published queue history, not from a
        promise that a date is certain.
      </p>
    </article>

    <article class="glass-card insight-panel">
      <div class="card-kicker">outcome check</div>
      <h2>what the reported dates say.</h2>
      <dl class="insight-detail-list">
        <div>
          <dt>deliveries in arrival window</dt>
          <dd>{percentage(metrics.arrivalWithinWindow, metrics.arrivalEvaluations)}</dd>
        </div>
        <div>
          <dt>median arrival miss</dt>
          <dd>{missDays(metrics.medianArrivalMissDays)}</dd>
        </div>
        <div>
          <dt>routes represented</dt>
          <dd>{metrics.routeCount || '—'}</dd>
        </div>
        <div>
          <dt>configurations represented</dt>
          <dd>{metrics.configurationCount || '—'}</dd>
        </div>
      </dl>
      <p class="insight-note">
        This is a live snapshot comparison, not a sealed historical test set. More reports make the
        picture less noisy.
      </p>
    </article>
  </section>

  <section class="glass-card insight-table-card" aria-labelledby="recent-reports-title">
    <div class="insight-table-heading">
      <div>
        <div class="card-kicker">recent reports</div>
        <h2 id="recent-reports-title">the latest community signal.</h2>
      </div>
      <span class="insight-source-date">
        AYN updated {formatDate(dataset.sourceLatestDate)}
      </span>
    </div>
    {#if recentRows.length}
      <div class="insight-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">configuration</th>
              <th scope="col">bucket</th>
              <th scope="col">dispatch</th>
              <th scope="col">estimate</th>
              <th scope="col">confidence</th>
            </tr>
          </thead>
          <tbody>
            {#each recentRows as row (row.report.id)}
              <tr>
                <td data-label="configuration">{displayConfiguration(row.report)}</td>
                <td data-label="bucket">{row.report.orderPrefix}</td>
                <td data-label="dispatch">{reportDate(row.report.dispatchedOn)}</td>
                <td data-label="estimate">
                  {row.estimate ? reportDate(row.estimate.dispatch.likelyDate) : '—'}
                </td>
                <td data-label="confidence">
                  {row.estimate ? `${row.estimate.dispatch.confidence} · ${missDays(row.dispatchMissDays)}` : '—'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="insight-empty">
        <strong>no community reports yet.</strong>
        <span>When someone shares a real shipment outcome, it will appear here.</span>
      </div>
    {/if}
    <p class="insight-footnote">
      {#if metrics.latestSubmission}
        latest report {formatFreshness(metrics.latestSubmission)}.
      {:else}
        reports update as soon as the community contributes them.
      {/if}
      No names, addresses, tracking numbers, or analytics are collected.
    </p>
  </section>

  <footer class="site-footer">
    <div class="footer-brand"><span class="wordmark-dot"></span><span>thor when?</span></div>
    <p>anonymous community data, shown plainly.</p>
    <div class="footer-links">
      <a href={homeHref}>estimate <span aria-hidden="true">↗</span></a>
      <a href="https://github.com/castdrian/thor-when#methodology" target="_blank" rel="noopener noreferrer"
        >methodology <span aria-hidden="true">↗</span></a
      >
      <a href="https://github.com/castdrian/thor-when#privacy" target="_blank" rel="noopener noreferrer"
        >privacy <span aria-hidden="true">↗</span></a
      >
    </div>
  </footer>
</main>
