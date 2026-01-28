<script lang="ts">
  import { onMount } from "svelte";
  import {
    Search,
    History,
    Shield,
    AlertTriangle,
    CheckCircle,
    Copy,
    ExternalLink,
    RefreshCw,
  } from "lucide-svelte";

  let url = "";
  let loading = false;
  let auditResult: any = null;
  let history: any[] = [];
  let error = "";
  let copyFeedback = false;

  async function fetchHistory() {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        history = (await res.ok) ? await res.json() : [];
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  }

  async function runAudit() {
    if (!url) return;
    loading = true;
    error = "";
    auditResult = null;

    try {
      const res = await fetch(`/api/audit?url=${encodeURIComponent(url)}`);
      const data = (await res.json()) as any;

      if (res.ok) {
        auditResult = data;
        await fetchHistory();
      } else {
        error = data.error || "Audit failed";
      }
    } catch (e) {
      error = "Network error. Please try again.";
    } finally {
      loading = false;
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    copyFeedback = true;
    setTimeout(() => (copyFeedback = false), 2000);
  }

  function loadFromHistory(item: any) {
    url = item.url;
    auditResult = item;
  }

  onMount(fetchHistory);

  $: suggestedHeadersCode = auditResult?.aiAnalysis?.suggestions
    ? JSON.stringify(auditResult.aiAnalysis.suggestions, null, 2)
    : "";
</script>

<main class="container">
  <header>
    <div class="logo">
      <Shield size={32} color="#2563eb" />
      <h1>HTTP Coach</h1>
    </div>
    <p class="subtitle">Personalized security header audit for your website</p>
  </header>

  <section class="search-section">
    <div class="input-group">
      <input
        type="url"
        bind:value={url}
        placeholder="https://example.com"
        on:keydown={(e) => e.key === "Enter" && runAudit()}
      />
      <button on:click={runAudit} disabled={loading || !url}>
        {#if loading}
          <RefreshCw size={18} class="spin" />
          Scanning...
        {:else}
          <Search size={18} />
          Audit
        {/if}
      </button>
    </div>
    {#if error}
      <p class="error">{error}</p>
    {/if}
  </section>

  <div class="main-grid">
    <div class="content">
      {#if auditResult}
        <div class="card result-header">
          <div
            class="score-badge"
            class:high={auditResult.score >= 80}
            class:med={auditResult.score >= 40 && auditResult.score < 80}
            class:low={auditResult.score < 40}
          >
            {auditResult.score}/100
          </div>
          <div class="url-info">
            <h2>{auditResult.url}</h2>
            <p>Scanned on {new Date(auditResult.timestamp).toLocaleString()}</p>
          </div>
        </div>

        <div class="panels-grid">
          <!-- Raw Headers Panel -->
          <div class="card panel">
            <h3><CheckCircle size={18} /> Present Headers</h3>
            <div class="header-list">
              {#each Object.entries(auditResult.headersFound) as [key, value]}
                <div class="header-item">
                  <span class="header-name">{key}:</span>
                  <span class="header-value">{value}</span>
                </div>
              {:else}
                <p class="empty-state">No security headers detected.</p>
              {/each}
            </div>
          </div>

          <!-- Missing Headers Panel -->
          <div class="card panel">
            <h3><AlertTriangle size={18} /> Missing Headers</h3>
            <ul class="missing-list">
              {#each auditResult.missing as header}
                <li>{header}</li>
              {:else}
                <p class="success-state">
                  Great! No major security headers are missing.
                </p>
              {/each}
            </ul>
          </div>
        </div>

        <!-- AI Analysis Section -->
        {#if auditResult.aiAnalysis}
          <div class="card ai-panel">
            <div class="ai-header">
              <h3>Expert Analysis</h3>
              <span class="ai-badge">AI Powered</span>
            </div>

            <div class="ai-content">
              <div class="ai-section">
                <h4>Explanation</h4>
                <p>{auditResult.aiAnalysis.explanation}</p>
              </div>

              <div class="ai-section">
                <h4>Suggested Implementation</h4>
                <div class="code-block">
                  <button
                    class="copy-btn"
                    on:click={() => copyToClipboard(suggestedHeadersCode)}
                  >
                    {#if copyFeedback}
                      Saved!
                    {:else}
                      <Copy size={14} /> Copy
                    {/if}
                  </button>
                  <pre><code>{suggestedHeadersCode}</code></pre>
                </div>
              </div>

              {#if auditResult.aiAnalysis.warnings}
                <div class="ai-section warnings">
                  <h4>⚠️ Breakage Warnings</h4>
                  <p>{auditResult.aiAnalysis.warnings}</p>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {:else if !loading}
        <div class="empty-dashboard">
          <Shield size={64} opacity={0.1} />
          <p>Enter a URL above to start your security audit.</p>
        </div>
      {/if}
    </div>

    <!-- History Sidebar -->
    <aside class="sidebar">
      <div class="card history-card">
        <h3><History size={18} /> Recent Audits</h3>
        <div class="history-list">
          {#each history as item}
            <button class="history-item" on:click={() => loadFromHistory(item)}>
              <div class="history-info">
                <span class="history-url">{item.url}</span>
                <span class="history-date"
                  >{new Date(item.timestamp).toLocaleDateString()}</span
                >
              </div>
              <span
                class="history-score"
                class:high={item.score >= 80}
                class:med={item.score >= 40 && item.score < 80}
                class:low={item.score < 40}
              >
                {item.score}
              </span>
            </button>
          {:else}
            <p class="empty-history">No scan history yet.</p>
          {/each}
        </div>
      </div>
    </aside>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family:
      "Inter",
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif;
    background-color: #f8fafc;
    color: #1e293b;
  }

  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, #1e293b 0%, #2563eb 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    color: #64748b;
    font-size: 1.1rem;
  }

  .search-section {
    margin-bottom: 3rem;
    max-width: 700px;
    margin-left: auto;
    margin-right: auto;
  }

  .input-group {
    display: flex;
    gap: 0.5rem;
    background: white;
    padding: 0.5rem;
    border-radius: 12px;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.1),
      0 2px 4px -2px rgb(0 0 0 / 0.1);
  }

  input {
    flex: 1;
    border: none;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    outline: none;
    border-radius: 8px;
  }

  button {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  button:hover:not(:disabled) {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .error {
    color: #ef4444;
    text-align: center;
    margin-top: 1rem;
    font-weight: 500;
  }

  .main-grid {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
  }

  @media (max-width: 850px) {
    .main-grid {
      grid-template-columns: 1fr;
    }
    .sidebar {
      order: 2;
    }
  }

  .card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    background: linear-gradient(to right, #ffffff, #f1f5f9);
  }

  .score-badge {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 800;
    color: white;
  }

  .score-badge.high {
    background: #22c55e;
  }
  .score-badge.med {
    background: #f59e0b;
  }
  .score-badge.low {
    background: #ef4444;
  }

  .url-info h2 {
    margin: 0;
    font-size: 1.5rem;
    word-break: break-all;
  }

  .url-info p {
    margin: 0.25rem 0 0 0;
    color: #64748b;
    font-size: 0.9rem;
  }

  .panels-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  @media (max-width: 600px) {
    .panels-grid {
      grid-template-columns: 1fr;
    }
  }

  h3 {
    margin: 0 0 1.25rem 0;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #334155;
  }

  .header-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .header-item {
    display: flex;
    flex-direction: column;
    background: #f8fafc;
    padding: 0.75rem;
    border-radius: 8px;
    border: 1px solid #f1f5f9;
  }

  .header-name {
    font-weight: 700;
    font-size: 0.8rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .header-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      monospace;
    font-size: 0.9rem;
    color: #1e293b;
    word-break: break-all;
    margin-top: 0.25rem;
  }

  .missing-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .missing-list li {
    background: #fff1f2;
    color: #991b1b;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.95rem;
    border-left: 4px solid #f43f5e;
  }

  .ai-panel {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }

  .ai-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .ai-badge {
    background: #dbeafe;
    color: #1e40af;
    padding: 0.25rem 0.75rem;
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .ai-section {
    margin-bottom: 2rem;
  }

  .ai-section:last-child {
    margin-bottom: 0;
  }

  h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #1e293b;
  }

  .ai-section p {
    margin: 0;
    line-height: 1.6;
    color: #475569;
  }

  .code-block {
    position: relative;
    background: #0f172a;
    border-radius: 12px;
    padding: 1.25rem;
    overflow: hidden;
  }

  .code-block pre {
    margin: 0;
    overflow-x: auto;
  }

  .code-block code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      monospace;
    font-size: 0.85rem;
    color: #e2e8f0;
  }

  .copy-btn {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.4rem 0.8rem;
    font-size: 0.75rem;
    background: #334155;
    opacity: 0.8;
  }

  .copy-btn:hover {
    opacity: 1;
    background: #475569;
  }

  .warnings {
    background: #fffbeb;
    padding: 1.25rem;
    border-radius: 12px;
    border: 1px solid #fef3c7;
  }

  .warnings h4 {
    color: #92400e;
  }
  .warnings p {
    color: #b45309;
  }

  .history-card {
    position: sticky;
    top: 2rem;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 10px;
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
  }

  .history-item:hover {
    background: #f1f5f9;
    border-color: #e2e8f0;
  }

  .history-info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .history-url {
    font-weight: 600;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #1e293b;
  }

  .history-date {
    font-size: 0.75rem;
    color: #64748b;
  }

  .history-score {
    font-weight: 800;
    font-size: 0.85rem;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    color: white;
    min-width: 2rem;
    text-align: center;
  }

  .history-score.high {
    background: #22c55e;
  }
  .history-score.med {
    background: #f59e0b;
  }
  .history-score.low {
    background: #ef4444;
  }

  .empty-dashboard,
  .empty-history {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 4rem 2rem;
    color: #94a3b8;
  }

  .empty-history {
    padding: 2rem 1rem;
    font-size: 0.9rem;
  }

  :global(.spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
