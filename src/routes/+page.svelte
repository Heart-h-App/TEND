<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Diagram from "$lib/components/diagramConnection.svelte";

  type Rel = {
    name: string;
    description: string;
    status: 'on track' | 'strained';
    details: { '+': string; '∆': string; '→': string };
  };

  let email = '';
  let mapData: any = null;
  let loadingMap = false;
  let northStarData: any = null;
  let loadingNorthStar = false;
  let experimentsData: any = null;
  let loadingExperiments = false;
  let emailError = '';
  let emailInput: HTMLInputElement;

  // modal flags (mobile-first: always full-screen)
  let showMapModal = false;
  let showNorthStarModal = false;
  let showExperimentModal = false;

  // one-shot deep-link open
  let pendingModalOpen = false;

  // Experiment modal state
  let experimentText = '';
  let experimentLoading = false;
  let experimentError: string | null = null;
  let experimentResult: any = null;
  let experimentTextLimitReached = false;

  // Delete account state
  let showDeleteConfirmation = false;
  let deletingAccount = false;

  // debounce
  let debounceTimer: NodeJS.Timeout | null = null;

  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  function handleTileClick(event: Event) {
    const tileType = (event.currentTarget as HTMLElement)?.getAttribute('data-tile');

    if (!isValidEmail(email)) {
      emailError = 'Please enter a valid email';
      emailInput?.focus();
      return;
    }

    // progressive unlock
    if (tileType === 'northstar' && !mapData) return;
    if (tileType === 'experiments' && (!mapData || !northStarData)) return;

    if (tileType === 'map') {
      if (mapData) showMapModal = true;
      else goto(`/mapConnection?email=${encodeURIComponent(email)}`);
    } else if (tileType === 'northstar') {
      if (northStarData) showNorthStarModal = true;
      else goto(`/createNorthStar?email=${encodeURIComponent(email)}`);
    } else if (tileType === 'experiments') {
      if (!experimentsData || experimentsData.length === 0) showExperimentModal = true;
      else goto(`/designExperiment?email=${encodeURIComponent(email)}`);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTileClick(event);
    }
  }

  async function checkForExistingMap() {
    if (!email.trim()) { mapData = null; return; }
    loadingMap = true;
    try {
      const res = await fetch(`/api/relationships?ownerEmail=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        mapData = data.length > 0 ? data[0] : null;
      } else {
        mapData = null;
      }
    } catch (e) {
      console.error('Failed to check existing relationships:', e);
      mapData = null;
    } finally {
      loadingMap = false;
    }
  }

  async function checkForExistingNorthStar() {
    if (!email.trim()) { northStarData = null; return; }
    loadingNorthStar = true;
    try {
      const res = await fetch(`/api/northStar?ownerEmail=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        northStarData = data.length > 0 ? data[0] : null;
      } else {
        northStarData = null;
      }
    } catch (e) {
      console.error('Failed to check existing north stars:', e);
      northStarData = null;
    } finally {
      loadingNorthStar = false;
    }
  }

  async function checkForExistingExperiments() {
    if (!email.trim()) { experimentsData = null; return; }
    loadingExperiments = true;
    try {
      const res = await fetch(`/api/experiments?ownerEmail=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          experimentsData = data;
        } else {
          experimentsData = null;
          if (isValidEmail(email) && !showExperimentModal) showExperimentModal = true;
        }
      } else {
        experimentsData = null;
      }
    } catch (e) {
      console.error('Failed to check existing experiments:', e);
      experimentsData = null;
    } finally {
      loadingExperiments = false;
    }
  }

  // Escape to close whichever modal is open
  function handleEscapeKey(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    if (showMapModal) showMapModal = false;
    else if (showNorthStarModal) showNorthStarModal = false;
    else if (showExperimentModal) {
      showExperimentModal = false;
      experimentText = '';
      experimentError = null;
      experimentResult = null;
    } else if (showDeleteConfirmation) {
      showDeleteConfirmation = false;
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleEscapeKey);

    const sp = new URLSearchParams(window.location.search);
    const emailFromUrl = sp.get('email');
    if (emailFromUrl && isValidEmail(emailFromUrl)) email = emailFromUrl;

    const wantsOpen = sp.get('openModal') === 'true';
    if (wantsOpen) {
      pendingModalOpen = true;
      checkForExistingMap();
      checkForExistingNorthStar?.();
      checkForExistingExperiments?.();

      const clean = new URL(window.location.href);
      clean.searchParams.delete('openModal');
      clean.searchParams.delete('selectNode');
      history.replaceState({}, '', clean);
    }

    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  });

  // one-shot: open map modal once data is ready
  $: if (pendingModalOpen && mapData) {
    showMapModal = true;
    pendingModalOpen = false;
  }

  function debouncedCheckData() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (email && isValidEmail(email)) {
        checkForExistingMap();
        checkForExistingNorthStar();
        checkForExistingExperiments();
        saveUserEmail();
      }
    }, 800);
  }

  $: if (email) {
    debouncedCheckData();
  } else {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    mapData = null;
    northStarData = null;
    experimentsData = null;
  }

  async function saveUserEmail() {
    if (!isValidEmail(email)) return;
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch (_) { /* ignore */ }
  }

  function handleDeleteAccount() {
    if (!isValidEmail(email)) { emailInput?.focus(); return; }
    showDeleteConfirmation = true;
  }

  async function confirmDelete() {
    if (!isValidEmail(email)) return;
    deletingAccount = true;
    try {
      const response = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.status >= 200 && response.status < 300) {
        email = '';
        mapData = null;
        northStarData = null;
        experimentsData = null;
        showDeleteConfirmation = false;
        alert('Account deleted successfully.');
      } else {
        try {
          const errorData = await response.json();
          alert(`Failed to delete account: ${errorData.error || 'Please try again.'}`);
        } catch {
          alert(`Failed to delete account. Status: ${response.status}`);
        }
      }
    } catch (e) {
      alert(`Failed to delete account: ${e instanceof Error ? e.message : 'Please try again.'}`);
    } finally {
      deletingAccount = false;
    }
  }

  // Experiment helpers
  $: experimentTextLimitReached = experimentText.length >= 2000;

  async function designExperiment() {
    experimentError = null;
    experimentResult = null;

    if (!experimentText.trim()) {
      experimentError = 'Please enter a description.';
      return;
    }
    experimentLoading = true;
    try {
      const res = await fetch('/designExperiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: experimentText, ownerEmail: email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      experimentResult = data;

      if (email) {
        try {
          const res2 = await fetch('/api/experiments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ownerEmail: email, ...experimentResult })
          });
          const saved = await res2.json();
          if (!res2.ok) console.error('Save failed:', saved?.error);
          else checkForExistingExperiments();
        } catch (saveError) {
          console.error('Failed to save experiment:', saveError);
        }
      }
    } catch (e: any) {
      experimentError = String(e?.message || e || 'Unknown error');
    } finally {
      experimentLoading = false;
    }
  }
</script>

<main class="container">
  <div class="dashboard-header">
    <h2>TEND<br /><span style="font-size: 0.8em; font-style: italic; color: var(--text);">nurture your connections</span></h2>

    <label for="owner-email">Email:</label>
    <input
      type="email"
      bind:value={email}
      bind:this={emailInput}
      on:input={() => { emailError = ''; }}
      placeholder="Enter your email"
      class:error={emailError}
    />
    {#if emailError}<div class="error-message">{emailError}</div>{/if}
  </div>

  <div class="dashboard-grid">
    <!-- Relationship Map Tile -->
    <div class="dashboard-tile" on:click={handleTileClick} on:keydown={handleKeydown} role="button" tabindex="0" class:masked={isValidEmail(email) && !mapData} data-tile="map">
      {#if isValidEmail(email) && !mapData}<div class="lfg-button">LFG</div>{/if}
      <div class="tile-header"><h3>🗺️ Relationship Map</h3></div>
      <div class="tile-content">
        <p class="tile-description">Map your important people</p>
        <div class="tile-preview">
          {#if loadingMap}
            <div class="loading-state">Loading...</div>
          {:else if mapData}
            <div class="diagram-container">
              <Diagram 
                nodes={[
                  { id: 'you', label: 'You', name: 'You', description: '', status: undefined, details: {}, x: 50, y: 50, width: 300, height: 225 },
                  { id: 'connection', label: mapData.name, desc: mapData.description, name: mapData.name, description: mapData.description, status: mapData.status, details: mapData.details, x: 450, y: 50, width: 300, height: 225 }
                ]}
                edges={[{ id: 'main-connection', source: 'you', target: 'connection', status: mapData.status }]}
              />
            </div>
          {:else}
            <div class="placeholder-content">
              <div class="placeholder-diagram">
                <div class="placeholder-node">You</div>
                <div class="placeholder-connection"></div>
                <div class="placeholder-node">Connection</div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- North Star Tile -->
    <div class="dashboard-tile" on:click={handleTileClick} on:keydown={handleKeydown} role="button" tabindex="0" class:masked={isValidEmail(email) && !northStarData} class:locked={isValidEmail(email) && !mapData} data-tile="northstar">
      {#if isValidEmail(email) && !mapData}
        <div class="lock-icon">🔒</div>
      {:else if isValidEmail(email) && !northStarData}
        <div class="lfg-button">LFG</div>
      {/if}
      <div class="tile-header"><h3>⭐ North Star</h3></div>
      <div class="tile-content">
        <p class="tile-description">Set your direction</p>
        <div class="tile-preview">
          {#if loadingNorthStar}
            <div class="loading-state">Loading...</div>
          {:else if northStarData}
            <div class="placeholder-content">
              <div class="placeholder-star">
                <div class="star-center real-northstar-text">
                  {#if northStarData.haiku}
                    {#each northStarData.haiku.split(',') as line, index}
                      <div>{line.trim()}{index < northStarData.haiku.split(',').length - 1 ? ',' : ''}</div>
                    {/each}
                  {:else}Essence{/if}
                </div>
                <div class="star-point north real-northstar-text">
                  <div class="direction-heading">Growth</div>
                  {#if northStarData.north}{#each northStarData.north as item}<div>{item.emoji} {item.phrase}</div>{/each}{/if}
                </div>
                <div class="star-point east real-northstar-text">
                  <div class="direction-heading">Vibe</div>
                  {#if northStarData.east}{#each northStarData.east as item}<div>{item.emoji} {item.phrase}</div>{/each}{/if}
                </div>
                <div class="star-point south real-northstar-text">
                  <div class="direction-heading">Values</div>
                  {#if northStarData.south}{#each northStarData.south as item}<div>{item.emoji} {item.phrase}</div>{/each}{/if}
                </div>
                <div class="star-point west real-northstar-text">
                  <div class="direction-heading">Avoid</div>
                  {#if northStarData.west}{#each northStarData.west as item}<div>{item.emoji} {item.phrase}</div>{/each}{/if}
                </div>
              </div>
            </div>
          {:else}
            <div class="placeholder-content">
              <div class="placeholder-star">
                <div class="star-center">Essence</div>
                <div class="star-point north">Growth</div>
                <div class="star-point east">Vibe</div>
                <div class="star-point south">Values</div>
                <div class="star-point west">Avoid</div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Experiments Tile -->
    <div class="dashboard-tile experiments-tile" on:click={handleTileClick} on:keydown={handleKeydown} role="button" tabindex="0" class:masked={isValidEmail(email) && !experimentsData} class:locked={isValidEmail(email) && (!mapData || !northStarData)} data-tile="experiments">
      {#if isValidEmail(email) && (!mapData || !northStarData)}
        <div class="lock-icon">🔒</div>
      {:else if isValidEmail(email)}
        <div class="lfg-button">{experimentsData && experimentsData.length > 0 ? 'Create New' : 'LFG'}</div>
      {/if}
      <div class="tile-header"><h3>🧪 Experiments</h3></div>
      <div class="tile-content">
        <p class="tile-description">Small steps, radical intent, real progress</p>
        <div class="tile-preview">
          {#if loadingExperiments}
            <div class="loading-state">Loading...</div>
          {:else if experimentsData && experimentsData.length > 0}
            <div class="experiments-grid-container">
              <div class="experiments-grid narrow-view">
                <div class="experiments-scroll-container">
                  <table class="experiments-table">
                    <thead>
                      <tr>
                        <th class="step-header"></th>
                        {#each experimentsData as experiment, index}
                          <th class="experiment-header" class:completed={experiment.learnings}>
                            <div class="experiment-number">{index + 1}</div>
                            <div class="experiment-date">{new Date(experiment.createdAt).toLocaleDateString()}</div>
                            <div class="experiment-status-badge">
                              {#if experiment.learnings}<span class="status completed">✓</span>
                              {:else}<span class="status pending">⏳</span>{/if}
                            </div>
                          </th>
                        {/each}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="step-label">Challenge</td>
                        {#each experimentsData as experiment}
                          <td class="experiment-cell" title={experiment.challenge}>{experiment.challenge}</td>
                        {/each}
                      </tr>
                      <tr>
                        <td class="step-label">Hypothesis</td>
                        {#each experimentsData as experiment}
                          <td class="experiment-cell" title={experiment.hypothesis}>{experiment.hypothesis}</td>
                        {/each}
                      </tr>
                      <tr>
                        <td class="step-label">Intervention</td>
                        {#each experimentsData as experiment}
                          <td class="experiment-cell" title={experiment.intervention}>{experiment.intervention}</td>
                        {/each}
                      </tr>
                      <tr>
                        <td class="step-label">Measure</td>
                        {#each experimentsData as experiment}
                          <td class="experiment-cell" title={experiment.measure}>{experiment.measure}</td>
                        {/each}
                      </tr>
                      <tr>
                        <td class="step-label">Learning</td>
                        {#each experimentsData as experiment}
                          <td class="experiment-cell" title={experiment.learnings || 'Not completed yet'}>{experiment.learnings || '—'}</td>
                        {/each}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          {:else}
            <div class="placeholder-content">
              <div class="placeholder-experiment">
                <div class="experiment-step">Challenge</div><div class="experiment-arrow">→</div>
                <div class="experiment-step">Hypothesis</div><div class="experiment-arrow">→</div>
                <div class="experiment-step">Intervention</div><div class="experiment-arrow">→</div>
                <div class="experiment-step">Measure</div><div class="experiment-arrow">→</div>
                <div class="experiment-step">Learning</div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  {#if isValidEmail(email)}
    <div class="delete-account-section">
      <button class="delete-account-btn" on:click={handleDeleteAccount}>Delete Account</button>
    </div>
  {/if}
</main>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmation}
  <div class="modal-backdrop" on:click={() => (showDeleteConfirmation = false)} on:keydown={(e) => e.key === 'Escape' && (showDeleteConfirmation = false)} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal" role="document" on:click|stopPropagation>
      <h3>Delete Account</h3>
      <p>Are you sure you want to delete your account?</p>
      <p><strong>This action cannot be undone.</strong></p>
      <div class="modal-buttons">
        <button class="cancel-btn" on:click={() => (showDeleteConfirmation = false)} disabled={deletingAccount}>Cancel</button>
        <button class="confirm-delete-btn" on:click={confirmDelete} disabled={deletingAccount}>{deletingAccount ? 'Deleting...' : 'Yes, Delete My Account'}</button>
      </div>
    </div>
  </div>
{/if}

<!-- Relationship Map Modal (full-screen mobile baseline) -->
{#if showMapModal && mapData}
  <div class="modal-backdrop" on:click={() => (showMapModal = false)} on:keydown={(e) => e.key === 'Escape' && (showMapModal = false)} role="dialog" aria-modal="true" tabindex="-1">
    <div class="map-modal" role="document" on:click|stopPropagation>
      <div class="map-modal-header">
        <h2>🗺️ Relationship Map</h2>
        <button class="close-btn" on:click={() => (showMapModal = false)} aria-label="Close modal">×</button>
      </div>
      <div class="map-modal-content">
        <div class="full-screen-diagram">
          <Diagram 
            nodes={[
              { id: 'you', label: 'You', name: 'You', description: '', status: undefined, details: {}, x: 50, y: 50, width: 300, height: 225 },
              { id: 'connection', label: mapData.name, desc: mapData.description, name: mapData.name, description: mapData.description, status: mapData.status, details: mapData.details, x: 450, y: 50, width: 300, height: 225 }
            ]}
            edges={[{ id: 'main-connection', source: 'you', target: 'connection', status: mapData.status }]}
          />
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- North Star Modal (full-screen mobile baseline) -->
{#if showNorthStarModal && northStarData}
  <div class="modal-backdrop" on:click={() => (showNorthStarModal = false)} on:keydown={(e) => e.key === 'Escape' && (showNorthStarModal = false)} role="dialog" aria-modal="true" tabindex="-1">
    <div class="northstar-modal" role="document" on:click|stopPropagation>
      <div class="northstar-modal-header">
        <h2>⭐ North Star</h2>
        <button class="close-btn" on:click={() => (showNorthStarModal = false)} aria-label="Close modal">×</button>
      </div>
      <div class="northstar-modal-content">
        <div class="full-screen-northstar">
          <div class="northstar-diagram">
            <div class="star-center-large">
              {#if northStarData.haiku}
                {#each northStarData.haiku.split(',') as line, index}
                  <div>{line.trim()}{index < northStarData.haiku.split(',').length - 1 ? ',' : ''}</div>
                {/each}
              {:else}Essence{/if}
            </div>
            <div class="star-point-large north-large">
              <div class="direction-heading-large">Growth</div>
              {#if northStarData.north}{#each northStarData.north as item}<div class="star-item-large">{item.emoji} {item.phrase}</div>{/each}{/if}
            </div>
            <div class="star-point-large east-large">
              <div class="direction-heading-large">Vibe</div>
              {#if northStarData.east}{#each northStarData.east as item}<div class="star-item-large">{item.emoji} {item.phrase}</div>{/each}{/if}
            </div>
            <div class="star-point-large south-large">
              <div class="direction-heading-large">Values</div>
              {#if northStarData.south}{#each northStarData.south as item}<div class="star-item-large">{item.emoji} {item.phrase}</div>{/each}{/if}
            </div>
            <div class="star-point-large west-large">
              <div class="direction-heading-large">Avoid</div>
              {#if northStarData.west}{#each northStarData.west as item}<div class="star-item-large">{item.emoji} {item.phrase}</div>{/each}{/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Experiment Modal (full-screen mobile baseline) -->
{#if showExperimentModal}
  <div class="modal-backdrop" on:click={() => (showExperimentModal = false)} on:keydown={(e) => e.key === 'Escape' && (showExperimentModal = false)} role="dialog" aria-modal="true" tabindex="-1">
    <div class="experiment-modal" role="document" on:click|stopPropagation>
      <div class="experiment-modal-header">
        <h2>🧪 Design your first experiment!</h2>
        <button class="close-btn" on:click={() => (showExperimentModal = false)} aria-label="Close modal">×</button>
      </div>
      <div class="experiment-modal-content">
        <div class="experiment-form">
          {#if !experimentResult}
            <div class="input-group">
              {#if experimentText}
                <label for="experiment-challenge-text" class="floating-label">
                  When you think about your current relationships and your goals, what's an important challenge you're facing? How are things going now? What opportunities and wins would success bring? What's currently most preventing success?
                </label>
              {/if}
              <textarea
                id="experiment-challenge-text"
                bind:value={experimentText}
                placeholder={experimentText ? "" : "When you think about your current relationships and your goals, what's an important challenge you're facing? How are things going now? What opportunities and wins would success bring? What's currently most preventing success?"}
                rows="4"
                maxlength="2000"
              ></textarea>
              {#if experimentTextLimitReached}<p class="error">Max 2000 characters</p>{/if}
            </div>

            <button on:click={designExperiment} disabled={experimentLoading}>
              {experimentLoading ? 'Thinking…' : 'LFG'}
            </button>
          {/if}

          {#if experimentError}<p class="error">{experimentError}</p>{/if}

          <p style="font-style: italic; margin-top: 1rem;">
            TEND helps you nurture connection by visualizing your important connections, setting direction for your relationships with a north star, and helping you design & run experiments to learn and grow
          </p>
        </div>

        {#if experimentResult}
          <div class="experiment-result">
            <h2>Your Experiment</h2>

            <div style="margin-bottom: 1rem;">
              <h3 style="margin-bottom: 0.5rem; color: var(--heading);">Challenge</h3>
              <p style="margin-bottom: 1rem;">{experimentResult.challenge}</p>
            </div>

            <div style="margin-bottom: 1rem;">
              <h3 style="margin-bottom: 0.5rem; color: var(--heading);">Hypothesis</h3>
              <p style="margin-bottom: 1rem;">{experimentResult.hypothesis}</p>
            </div>

            <div style="margin-bottom: 1rem;">
              <h3 style="margin-bottom: 0.5rem; color: var(--heading);">Intervention</h3>
              <p style="margin-bottom: 1rem;">{experimentResult.intervention}</p>
            </div>

            <div style="margin-bottom: 1rem;">
              <h3 style="margin-bottom: 0.5rem; color: var(--heading);">Measure</h3>
              <p style="margin-bottom: 1rem;">{experimentResult.measure}</p>
            </div>

            {#if experimentResult.learnings}
              <div style="margin-bottom: 1rem;">
                <h3 style="margin-bottom: 0.5rem; color: var(--heading);">Learnings</h3>
                <p style="margin-bottom: 1rem;">{experimentResult.learnings}</p>
              </div>
            {/if}

            <h2>Want experiments more tailored to you?</h2>
            <p style="font-style: italic; margin-top: 1rem;">
              Create a map and north star and TEND will use those to hone experiments to your context and goals!
            </p>

            <div class="experiment-result-actions">
              <button on:click={() => (showExperimentModal = false)} class="primary-btn">LFG</button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* ===== Minimal overflow fixes ===== */
  *, *::before, *::after { box-sizing: border-box; } /* prevents hover-border growth from changing size */

  /* ===== Mobile-first baseline (single view for all sizes) ===== */

  .container { padding: 0 1rem; }
  .dashboard-header { margin-bottom: 2rem; }
  .dashboard-header input { margin-top: 0.5rem; max-width: 300px; }
  .dashboard-header input.error { border-color: #ff4444; box-shadow: 0 0 0 2px rgba(255,68,68,.2); }
  .error-message { color: #ff4444; font-size: .875rem; margin-top: .25rem; }

  .dashboard-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 2rem; }

  .dashboard-tile {
    background: var(--card-bg, #1a1a1a);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 1rem;
    cursor: pointer;
    transition: all .2s ease;
    position: relative;
    max-width: 100%;          /* never exceed grid column */
    overflow: hidden;         /* safety net for any inner spill */
  }
  .dashboard-tile:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.3); border: 3px solid white; }
  .dashboard-tile.masked::after {
    content: ''; position: absolute; inset: 0; background: rgba(255,255,255,.1); border-radius: 8px; pointer-events: none; z-index: 1;
  }
  .dashboard-tile.locked { opacity: .6; cursor: not-allowed; }
  .dashboard-tile.locked:hover { transform: none; box-shadow: 0 2px 8px rgba(0,0,0,.2); border: 2px solid var(--input-border); }

  .lfg-button, .lock-icon {
    position: absolute; top: 12px; left: 12px; z-index: 2; pointer-events: none;
  }
  .lfg-button {
    font-family: 'Mulish', sans-serif; font-weight: 600; font-size: 1em;
    padding: 8px 16px; border: none; border-radius: 4px; background-color: var(--button-bg); color: #fff;
  }
  .lock-icon { font-size: 1.5em; color: #888; }

  .tile-header { display: flex; justify-content: center; align-items: center; margin-bottom: 1rem; }
  .tile-header h3 { margin: 0; color: var(--heading); text-align: center; }
  .tile-description { color: var(--text); margin-bottom: 1rem; font-size: .9rem; font-style: italic; text-align: center; }

  .tile-preview {
    min-height: 280px; display:flex; align-items:center; justify-content:center;
    width: 100%; max-width: 100%;
    overflow-x: auto;        /* wide children (e.g., experiments table) scroll inside tile */
  }
  .placeholder-content { opacity: .6; width: 100%; }
  .loading-state { display:flex; align-items:center; justify-content:center; padding: 2rem; color: var(--text); font-style: italic; }

  /* Diagram area must scale down to tile width */
  .diagram-container { width: 100%; max-width: 100%; overflow: hidden; }
  .diagram-container :global(svg) { display: block; max-width: 100%; height: auto; }

  /* Diagram typography at mobile size */
  .diagram-container :global(.title) { font-size: 24px !important; font-weight: 600 !important; }
  .diagram-container :global(.emoji) { font-size: 24px !important; }

  /* Relationship Map Placeholder */
  .placeholder-diagram { display:flex; align-items:center; justify-content:center; padding: .5rem; gap: .5rem; }
  .placeholder-node { width: 72px; height: 72px; border: 2px dashed var(--input-border); border-radius: 50%; display:flex; align-items:center; justify-content:center; font-size: .78rem; color: var(--text); text-align:center; padding: .3rem; }
  .placeholder-connection { flex:none; width: 30px; height: 2px; background: var(--input-border); margin: 0; position: relative; }
  .placeholder-connection::after { content:''; position:absolute; right:-6px; top:-4px; border-left:8px solid var(--input-border); border-top:5px solid transparent; border-bottom:5px solid transparent; }

  /* North Star (mobile sizes) */
  .placeholder-star { position: relative; width: 312px; height: 240px; margin: 0 auto; max-width: 100%; } /* constrain when populated */
  .star-center {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 96px; height: 48px; border: 2px dashed var(--input-border); border-radius: 30px;
    display:flex; align-items:center; justify-content:center; font-size:.84rem; color: var(--text); text-align:center; padding:.3rem;
  }
  .star-point { position: absolute; width: 66px; height: 29px; border: 1px dashed var(--input-border); border-radius: 17px; display:flex; align-items:center; justify-content:center; font-size:.84rem; color: var(--text); text-align:center; padding:.3rem; }
  .star-point.north { top: 15px; left: 50%; transform: translateX(-50%); }
  .star-point.east { right: 2px; top: 50%; transform: translateY(-50%); }
  .star-point.south { bottom: 15px; left: 50%; transform: translateX(-50%); }
  .star-point.west { left: 2px; top: 50%; transform: translateY(-50%); }

  /* Real north star text style */
  .star-center.real-northstar-text,
  .star-point.real-northstar-text { background: var(--input-bg); border: 1.5px solid var(--input-border); border-radius: 12px; color: #fff; }
  .star-center.real-northstar-text { width: 121px; height: 71.5px; padding: .4rem; font-size: .65rem !important; line-height: 1.2; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; }
  .star-point.real-northstar-text { width: 110px; height: 65px; padding: .4rem; line-height: 1.1; flex-direction: column; align-items: flex-start; text-align: left; }
  .real-northstar-text { font-size: .5rem !important; color: #fff !important; }
  .direction-heading { font-weight: bold; font-size: .45rem !important; margin-bottom: .1rem; color:#888 !important; text-align:center !important; width:100%; display:block; }

  /* Experiment placeholder */
  .placeholder-experiment { display:flex; flex-direction: column; gap:.5rem; padding:.5rem; align-items:center; }
  .experiment-step { width: 78px; height: 42px; border: 2px dashed var(--input-border); border-radius: 10px; display:flex; align-items:center; justify-content:center; font-size:.84rem; color: var(--text); text-align:center; padding:.3rem; }
  .experiment-arrow { color: var(--input-border); font-weight: bold; transform: rotate(90deg); }

  /* Delete section */
  .delete-account-section { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--input-border); display:flex; justify-content:center; align-items:center; }
  .delete-account-btn { background-color: var(--brand-primary); color: #fff; border:none; padding: 8px 16px; border-radius: 4px; font-size: .9em; cursor:pointer; transition: background-color .3s ease; }
  .delete-account-btn:hover { background-color: #8a3a32; }

  /* Backdrop (shared) */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,1); display:flex; justify-content:center; align-items:center; z-index: 1000; }

  /* Small confirm modal */
  .modal { background: var(--bg); padding: 2rem; border-radius: 8px; width: 90%; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,.3); }
  .modal h3 { margin-top: 0; color: var(--heading); }
  .modal p { margin-bottom: 1rem; color: var(--text); }
  .modal-buttons { display:flex; gap: 1rem; justify-content:flex-end; margin-top: 1.5rem; }
  .cancel-btn { background: var(--input-bg); color: var(--text); border: 1px solid var(--input-border); }
  .cancel-btn:hover { background: var(--input-border); }
  .confirm-delete-btn { background: var(--brand-primary); color: #fff; }
  .confirm-delete-btn:hover { background: #8a3a32; }
  .confirm-delete-btn:disabled, .cancel-btn:disabled { opacity: .6; cursor: not-allowed; }

  /* Map & North Star full-screen modals (mobile baseline for all) */
  .map-modal, .northstar-modal {
    background: var(--bg); border-radius: 0; width: 100%; height: 100%; box-shadow: 0 8px 32px rgba(0,0,0,.4);
    display:flex; flex-direction:column; overflow:hidden; position: relative;
  }
  .map-modal-header, .northstar-modal-header {
    display:flex; justify-content:space-between; align-items:center; padding: 1rem; border-bottom: 1px solid var(--input-border); background: var(--card-bg, #1a1a1a);
  }
  .map-modal-header h2, .northstar-modal-header h2 { margin: 0; color: var(--heading); font-size: 1.5rem; }
  .close-btn { background: none; border: none; font-size: 2rem; color: var(--text); cursor: pointer; width: 40px; height: 40px; display:flex; align-items:center; justify-content:center; border-radius: 50%; transition: background-color .2s ease; }
  .close-btn:hover { background: var(--input-border); }

  .map-modal-content, .northstar-modal-content { flex: 1; display:flex; overflow:hidden; }
  .full-screen-diagram, .full-screen-northstar { flex:1; padding: 1rem; display:flex; align-items:center; justify-content:center; background: var(--bg); }

  .full-screen-diagram :global(.title), .full-screen-diagram :global(.emoji) { font-size: 28px !important; }
  .northstar-diagram { position: relative; width: 450px; height: 400px; margin: 0 auto; }
  .star-center-large {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 140px; height: 80px; background: var(--input-bg); border: 2px solid var(--input-border); border-radius: 16px;
    display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:.9rem; color:#fff; text-align:center; padding:.8rem; line-height:1.3;
  }
  .star-point-large {
    position: absolute; background: var(--input-bg); border: 2px solid var(--input-border); border-radius: 16px; display:flex; flex-direction:column;
    justify-content:center; align-items:flex-start; text-align:left; padding: 1rem; color:#fff;
  }
  .star-point-large.north-large { top: 20px; left: 50%; transform: translateX(-50%); width: 160px; height: 80px; }
  .star-point-large.south-large { bottom: 20px; left: 50%; transform: translateX(-50%); width: 160px; height: 80px; }
  .star-point-large.east-large { right: 20px; top: 50%; transform: translateY(-50%); width: 110px; height: 110px; }
  .star-point-large.west-large { left: 20px; top: 50%; transform: translateY(-50%); width: 110px; height: 110px; }
  .direction-heading-large { font-weight: bold; font-size: .8rem; margin-bottom: .5rem; color: #888; text-align: center; width: 100%; display:block; }
  .star-item-large { margin-bottom: .3rem; font-size: .75rem; line-height: 1.2; }

  /* Experiment modal (full-screen) */
  .experiment-modal {
    position: fixed; inset: 0; background: var(--background); z-index: 1001;
    display:flex; flex-direction:column;
  }
  .experiment-modal-header {
    display:flex; justify-content:space-between; align-items:center;
    padding: 1rem; border-bottom: 1px solid rgba(255,255,255,.1); background: var(--background);
    position: sticky; top: 0; z-index: 10;
  }
  .experiment-modal-header h2 { margin: 0; color: var(--heading); font-size: 1.3rem; }

  .experiment-modal-content {
    flex: 1 1 auto;          /* grow + shrink in flex column */
    min-width: 0;            /* allow wrapping instead of shrink-to-fit */
    min-height: 0;           /* create a proper scrollport */
    overflow: auto;          /* scroll when needed */
    padding: 1rem;
    width: 100%;
    max-width: 100%;
    margin: 0;
    box-sizing: border-box;
  }

  .experiment-form { margin-bottom: 1.5rem; }
  .input-group { margin-bottom: 1rem; }
  .floating-label { display:block; font-size:.9rem; color:#fff; font-weight:500; margin-bottom:.5rem; }

  .experiment-form textarea {
    width: 100%; min-height: 200px; padding: 1rem; border: 1px solid rgba(255,255,255,.2);
    border-radius: 8px; background: rgba(255,255,255,.05); color: var(--text);
    font-family: inherit; font-size: 1rem; resize: vertical; transition: border-color .2s ease;
  }
  .experiment-form textarea:focus { outline: none; border-color: var(--button-bg); }

  .experiment-form button {
    width: 100%; padding: 1rem 2rem; background: var(--button-bg); color:#fff; border:none; border-radius:8px;
    font-size: 1.1rem; font-weight:600; cursor:pointer; transition: background-color .2s ease; margin-top: 1rem;
  }
  .experiment-form button:hover:not(:disabled) { background: var(--button-hover); }
  .experiment-form button:disabled { opacity:.6; cursor:not-allowed; }

  .experiment-result {
    background: rgba(255,255,255,.05); border-radius: 12px; padding: 1.25rem; border: 1px solid rgba(255,255,255,.1);
    overflow-wrap: anywhere; word-break: normal; width: 100%; max-width: 100%; box-sizing: border-box;
  }
  .experiment-result h2 { color: var(--heading); margin-bottom: 1.25rem; text-align: center; }
  .experiment-result h3 { color: var(--heading); font-size: 1.1rem; font-weight: 600; }
  .experiment-result p { color: var(--text); line-height: 1.6; white-space: pre-wrap; }

  .experiment-result-actions { margin-top: 1.25rem; text-align: center; }
  .primary-btn { padding: 1rem 2rem; background: var(--button-bg); color:#fff; border:none; border-radius:8px; font-size: 1.1rem; font-weight:600; cursor:pointer; transition: background-color .2s ease; }
  .primary-btn:hover { background: var(--button-hover); }

  .error { color: #ff6b6b; font-size: .9rem; margin-top: .5rem; }

  /* Experiments table (narrow view only) */
  .experiments-grid-container { width: 100%; }
  .narrow-view { display: block; }
  .experiments-scroll-container { overflow-x: auto; overflow-y: visible; width: 100%; border: 1px solid var(--input-border); border-radius: 6px; }
  .experiments-table { width: 100%; border-collapse: collapse; min-width: fit-content; }
  .narrow-view .experiments-table { min-width: calc(200px + 250px * var(--experiment-count, 3)); }

  .step-header, .experiment-header, .experiment-number-header, .status-header {
    background: var(--input-bg); border-bottom: 2px solid var(--input-border); padding: .5rem; text-align: left; font-weight: 600; color: var(--heading); font-size: .8rem;
  }
  .step-label { background: var(--input-bg); border-right: 2px solid var(--input-border); padding: .5rem; font-weight: 600; color: var(--heading); font-size: .8rem; white-space: nowrap; min-width: 120px; }
  .experiment-header { min-width: 200px; text-align: center; border-right: 1px solid var(--input-border); }
  .experiment-header.completed { background-color: rgba(34,197,94,.1); }
  .experiment-number { font-size: 1rem; font-weight: 700; color: var(--button-bg); margin-bottom: .25rem; }
  .experiment-header.completed .experiment-number { color: #22c55e; }
  .experiment-date { font-size: .7rem; color: var(--text); opacity: .8; margin-bottom: .25rem; }
  .experiment-status-badge .status { font-size: .9rem; }

  .experiment-cell {
    padding: .5rem; border-right: 1px solid var(--input-border); border-bottom: 1px solid var(--input-border);
    vertical-align: top; font-size: .8rem; line-height: 1.3; color: var(--text); max-width: 200px; overflow-wrap: anywhere;
  }
  .narrow-view .experiment-cell { min-width: 150px; max-width: 180px; }
</style>