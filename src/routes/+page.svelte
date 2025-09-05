<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Diagram from "$lib/components/diagramConnection.svelte";
  import type { Node as DNode, Edge as DEdge } from "$lib/components/diagramConnection.svelte";

  type Rel = {
    name: string;
    description: string;
    status: 'on track' | 'strained';
    details: { '+': string; '∆': string; '→': string };
  };

  let email = '';
  let mapData: Rel | null = null;
  let loadingMap = false;
  let northStarData: any = null;
  let loadingNorthStar = false;
  let experimentsData: any = null;
  let loadingExperiments = false;
  let emailError = '';
  let emailInput: HTMLInputElement;
  let pendingModalOpen = false;
  let pendingNodeSelect = '';

  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  function handleInteraction() {
    if (!isValidEmail(email)) {
      emailError = 'Please enter a valid email';
      emailInput?.focus();
      return false;
    }
    emailError = '';
    return true;
  }

  function handleTileClick(event: Event) {
    const target = event.currentTarget as HTMLElement;
    const tileType = target?.getAttribute('data-tile');
    
    if (!isValidEmail(email)) {
      emailInput.focus();
      return;
    }
    
    // Check prerequisites for progressive unlock
    if (tileType === 'northstar' && !mapData) {
      // North Star requires Map to be completed first
      return;
    }
    
    if (tileType === 'experiments' && (!mapData || !northStarData)) {
      // Experiments requires both Map and North Star to be completed
      return;
    }
    
    // Navigate with email parameter or show modal
    if (tileType === 'map') {
      if (mapData) {
        showMapModal = true;
      } else {
        goto(`/mapConnection?email=${encodeURIComponent(email)}`);
      }
    } else if (tileType === 'northstar') {
      if (northStarData) {
        showNorthStarModal = true;
      } else {
        goto(`/createNorthStar?email=${encodeURIComponent(email)}`);
      }
    } else if (tileType === 'experiments') {
      goto(`/designExperiment?email=${encodeURIComponent(email)}`);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTileClick(event);
    }
  }

  async function checkForExistingMap() {
    if (!email.trim()) {
      mapData = null;
      return;
    }
    
    loadingMap = true;
    try {
      const res = await fetch(`/api/relationships?ownerEmail=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          mapData = data[0]; // Use most recent relationship
        } else {
          mapData = null;
        }
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
    if (!email.trim()) {
      northStarData = null;
      return;
    }
    
    loadingNorthStar = true;
    try {
      const res = await fetch(`/api/northStar?ownerEmail=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          northStarData = data[0]; // Use most recent north star
        } else {
          northStarData = null;
        }
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
    if (!email.trim()) {
      experimentsData = null;
      return;
    }
    
    loadingExperiments = true;
    try {
      const res = await fetch(`/api/experiments?ownerEmail=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          experimentsData = data[0]; // Use most recent experiment
        } else {
          experimentsData = null;
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

  // Initialize email from URL parameters on mount
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');
    if (emailFromUrl && isValidEmail(emailFromUrl)) {
      email = emailFromUrl;
    }
    
    // Check for modal parameters
    const openModal = urlParams.get('openModal');
    const selectNode = urlParams.get('selectNode');
    
    if (openModal === 'true' && selectNode) {
      pendingModalOpen = true;
      pendingNodeSelect = selectNode;
      // Clean up URL parameters immediately
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('openModal');
      newUrl.searchParams.delete('selectNode');
      window.history.replaceState({}, '', newUrl.toString());
    }

    // Global escape key handler
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMapModal) {
          if (selectedNode) {
            selectedNode = null;
          } else {
            closeMapModal();
          }
        } else if (showNorthStarModal) {
          closeNorthStarModal();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalEscape);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalEscape);
    };
  });

  // Check for existing data when email changes
  $: if (email) {
    checkForExistingMap();
    checkForExistingNorthStar();
    checkForExistingExperiments();
    saveUserEmail();
  } else {
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
      // Fail gracefully - no error handling needed as per requirements
    } catch (e) {
      // Silently ignore errors
    }
  }

  let showDeleteConfirmation = false;
  let deletingAccount = false;
  let showMapModal = false;
  let selectedNode: any = null;
  let showNorthStarModal = false;

  function handleDeleteAccount() {
    if (!isValidEmail(email)) {
      emailInput?.focus();
      return;
    }
    showDeleteConfirmation = true;
  }

  function cancelDelete() {
    showDeleteConfirmation = false;
  }

  function closeMapModal() {
    showMapModal = false;
    selectedNode = null;
  }

  function closeNorthStarModal() {
    showNorthStarModal = false;
  }

  function handleNodeSelect(event: CustomEvent) {
    selectedNode = event.detail;
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
      
      // Check status code directly instead of relying on response.ok
      if (response.status >= 200 && response.status < 300) {
        
        // Clear all data and reset UI
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
        } catch (jsonError) {
          alert(`Failed to delete account. Status: ${response.status}`);
        }
      }
    } catch (e) {
      alert(`Failed to delete account: ${e instanceof Error ? e.message : 'Please try again.'}`);
    } finally {
      deletingAccount = false;
    }
  }
</script>

<section id="hero" style="min-height: 40px; margin-bottom: 16px; border-bottom: 1px solid var(--input-border);">
  <h1>Welcome to Heart(h)!</h1>
  <p style="font-style: italic;">
    Heart(h)'s tools help you connect with yourself and others, finding more joy and satisfaction with less grind and overwhelm
  </p>
</section>

<main class="container">
  <div class="dashboard-header">
    <h2>TEND
      <br>
      <span style="font-size: 0.8em; font-style: italic; color: var(--text);">nurture your connections</span>
    </h2>
    
    <label for="owner-email">Email:</label>
    <input 
      type="email" 
      bind:value={email}
      bind:this={emailInput}
      on:input={() => { 
        emailError = '';
        if (isValidEmail(email)) {
          checkForExistingMap(); 
          checkForExistingNorthStar();
          checkForExistingExperiments();
        }
      }}
      placeholder="Enter your email"
      class:error={emailError}
    />
    {#if emailError}
      <div class="error-message">{emailError}</div>
    {/if}
  </div>

  <div class="dashboard-grid">
    <!-- Relationship Map Tile -->
    <div class="dashboard-tile" on:click={handleTileClick} on:keydown={handleKeydown} role="button" tabindex="0" class:masked={isValidEmail(email) && !mapData} data-tile="map">
      {#if isValidEmail(email) && !mapData}
        <div class="lfg-button">LFG</div>
      {/if}
      <div class="tile-header">
        <h3>🗺️ Relationship Map</h3>
      </div>
      <div class="tile-content">
        <p class="tile-description">
          Map your important people
        </p>
        <div class="tile-preview">
          {#if loadingMap}
            <div class="loading-state">Loading...</div>
          {:else if mapData}
            <div class="real-diagram">
              <Diagram 
                nodes={[
                  { 
                    id: 'you', 
                    label: 'You', 
                    x: 50, 
                    y: 50,
                    width: 300,
                    height: 225
                  },
                  { 
                    id: 'connection', 
                    label: mapData.name, 
                    desc: mapData.description,
                    x: 450, 
                    y: 50,
                    width: 300,
                    height: 225
                  }
                ]}
                edges={[
                  { id: 'main-connection', source: 'you', target: 'connection', status: mapData.status }
                ]}
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
      <div class="tile-header">
        <h3>⭐ North Star</h3>
      </div>
      <div class="tile-content">
        <p class="tile-description">
          Set your direction
        </p>
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
                  {:else}
                    Essence
                  {/if}
                </div>
                <div class="star-point north real-northstar-text">
                  <div class="direction-heading">Growth</div>
                  {#if northStarData.north && northStarData.north.length > 0}
                    {#each northStarData.north as item}
                      <div>{item.emoji} {item.phrase}</div>
                    {/each}
                  {/if}
                </div>
                <div class="star-point east real-northstar-text">
                  <div class="direction-heading">Vibe</div>
                  {#if northStarData.east && northStarData.east.length > 0}
                    {#each northStarData.east as item}
                      <div>{item.emoji} {item.phrase}</div>
                    {/each}
                  {/if}
                </div>
                <div class="star-point south real-northstar-text">
                  <div class="direction-heading">Values</div>
                  {#if northStarData.south && northStarData.south.length > 0}
                    {#each northStarData.south as item}
                      <div>{item.emoji} {item.phrase}</div>
                    {/each}
                  {/if}
                </div>
                <div class="star-point west real-northstar-text">
                  <div class="direction-heading">Avoid</div>
                  {#if northStarData.west && northStarData.west.length > 0}
                    {#each northStarData.west as item}
                      <div>{item.emoji} {item.phrase}</div>
                    {/each}
                  {/if}
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
      {:else if isValidEmail(email) && !experimentsData}
        <div class="lfg-button">LFG</div>
      {/if}
      <div class="tile-header">
        <h3>🧪 Experiments</h3>
      </div>
      <div class="tile-content">
        <p class="tile-description">
          Small steps, radical intent, real progress
        </p>
        <div class="tile-preview">
          <div class="placeholder-content">
            <div class="placeholder-experiment">
              <div class="experiment-step">Challenge</div>
              <div class="experiment-arrow">→</div>
              <div class="experiment-step">Hypothesis</div>
              <div class="experiment-arrow">→</div>
              <div class="experiment-step">Intervention</div>
              <div class="experiment-arrow">→</div>
              <div class="experiment-step">Measure</div>
              <div class="experiment-arrow">→</div>
              <div class="experiment-step">Learning</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Account Section -->
  {#if isValidEmail(email)}
    <div class="delete-account-section">
      <button class="delete-account-btn" on:click={handleDeleteAccount}>
        Delete Account
      </button>
    </div>
  {/if}
</main>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmation}
  <div class="modal-backdrop" on:click={cancelDelete} on:keydown={(e) => e.key === 'Escape' && cancelDelete()} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal" role="document">
      <h3>Delete Account</h3>
      <p>Are you sure you want to delete your account?</p>
      <p><strong>This action cannot be undone.</strong></p>
      <div class="modal-buttons">
        <button class="cancel-btn" on:click={cancelDelete} disabled={deletingAccount}>
          Cancel
        </button>
        <button class="confirm-delete-btn" on:click={confirmDelete} disabled={deletingAccount}>
          {deletingAccount ? 'Deleting...' : 'Yes, Delete My Account'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Relationship Map Modal -->
{#if showMapModal && mapData}
  <div class="modal-backdrop" on:click={closeMapModal} role="dialog" aria-modal="true" tabindex="-1">
    <div class="map-modal" role="document" on:click|stopPropagation>
      <div class="map-modal-header">
        <h2>🗺️ Relationship Map</h2>
        <button class="close-btn" on:click={closeMapModal} aria-label="Close modal">×</button>
      </div>
      <div class="map-modal-content" class:no-hover={selectedNode}>
        <div class="full-screen-diagram">
          <Diagram 
            nodes={[
              { 
                id: 'you', 
                label: 'You',
                name: 'You',
                description: '',
                status: undefined,
                details: {},
                x: 50, 
                y: 50,
                width: 300,
                height: 225
              },
              { 
                id: 'connection', 
                label: mapData.name, 
                desc: mapData.description,
                name: mapData.name,
                description: mapData.description,
                status: mapData.status,
                details: mapData.details,
                x: 450, 
                y: 50,
                width: 300,
                height: 225
              }
            ]}
            edges={[
              { id: 'main-connection', source: 'you', target: 'connection', status: mapData.status }
            ]}
            on:nodeSelect={handleNodeSelect}
          />
        </div>
      </div>
      
      {#if selectedNode}
        <!-- Backdrop -->
        <button
          class="modal-backdrop-tray"
          on:click={() => (selectedNode = null)}
          aria-label="Close details"
        ></button>

        <!-- Side panel -->
        <aside 
          class="modal-side-tray" 
          aria-label="Relationship details"
        >
          <button
            class="tray-close-btn"
            on:click={() => (selectedNode = null)}
            aria-label="Close details"
          >
            ✕
          </button>

          <h3>{selectedNode.name}</h3>
          {#if selectedNode.description}
            <div class="tray-description">{selectedNode.description}</div>
          {/if}

          {#if selectedNode.status}
            <div class="tray-status">
              <span class="tray-status-label">Status:</span> 
              <span class="status-indicator status-{selectedNode.status.replace(' ', '-')}">{selectedNode.status}</span>
            </div>
          {/if}

          {#if selectedNode.details}
            <div class="tray-insights">
              {#each Object.entries(selectedNode.details) as [label, text]}
                <div class="tray-insight-item">
                  <div class="tray-insight-label">{label}</div>
                  <div class="tray-insight-text">{text}</div>
                </div>
              {/each}
            </div>
          {/if}
        </aside>
      {/if}
    </div>
  </div>
{/if}

<!-- North Star Modal -->
{#if showNorthStarModal && northStarData}
  <div class="modal-backdrop" on:click={closeNorthStarModal} role="dialog" aria-modal="true" tabindex="-1">
    <div class="northstar-modal" role="document" on:click|stopPropagation>
      <div class="northstar-modal-header">
        <h2>⭐ North Star</h2>
        <button class="close-btn" on:click={closeNorthStarModal} aria-label="Close modal">×</button>
      </div>
      <div class="northstar-modal-content">
        <div class="full-screen-northstar">
          <div class="northstar-diagram">
            <div class="star-center-large">
              {#if northStarData.haiku}
                {#each northStarData.haiku.split(',') as line, index}
                  <div>{line.trim()}{index < northStarData.haiku.split(',').length - 1 ? ',' : ''}</div>
                {/each}
              {:else}
                Essence
              {/if}
            </div>
            <div class="star-point-large north-large">
              <div class="direction-heading-large">Growth</div>
              {#if northStarData.north && northStarData.north.length > 0}
                {#each northStarData.north as item}
                  <div class="star-item-large">{item.emoji} {item.phrase}</div>
                {/each}
              {/if}
            </div>
            <div class="star-point-large east-large">
              <div class="direction-heading-large">Vibe</div>
              {#if northStarData.east && northStarData.east.length > 0}
                {#each northStarData.east as item}
                  <div class="star-item-large">{item.emoji} {item.phrase}</div>
                {/each}
              {/if}
            </div>
            <div class="star-point-large south-large">
              <div class="direction-heading-large">Values</div>
              {#if northStarData.south && northStarData.south.length > 0}
                {#each northStarData.south as item}
                  <div class="star-item-large">{item.emoji} {item.phrase}</div>
                {/each}
              {/if}
            </div>
            <div class="star-point-large west-large">
              <div class="direction-heading-large">Avoid</div>
              {#if northStarData.west && northStarData.west.length > 0}
                {#each northStarData.west as item}
                  <div class="star-item-large">{item.emoji} {item.phrase}</div>
                {/each}
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .dashboard-header {
    margin-bottom: 2rem;
  }

  .dashboard-header input {
    margin-top: 0.5rem;
    max-width: 300px;
  }

  .dashboard-header input.error {
    border-color: #ff4444;
    box-shadow: 0 0 0 2px rgba(255, 68, 68, 0.2);
  }

  .error-message {
    color: #ff4444;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .dashboard-tile {
    background: var(--card-bg, #1a1a1a);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .dashboard-tile.masked::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    pointer-events: none;
    z-index: 1;
  }

  .lfg-button {
    position: absolute;
    top: 12px;
    left: 12px;
    font-family: 'Mulish', sans-serif;
    font-weight: 600;
    font-size: 1em;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background-color: var(--button-bg);
    color: white;
    cursor: pointer;
    transition: background-color 0.3s ease;
    z-index: 2;
    pointer-events: none;
  }

  .lock-icon {
    position: absolute;
    top: 12px;
    left: 12px;
    font-size: 1.5em;
    color: #888;
    z-index: 2;
    pointer-events: none;
  }

  .dashboard-tile.locked {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .dashboard-tile.locked:hover {
    transform: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    border: 2px solid var(--input-border);
  }

  .dashboard-tile:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 3px solid white;
  }

  .tile-header {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 1rem;
  }

  .tile-header h3 {
    margin: 0;
    color: var(--heading);
    text-align: center;
  }

  .experiments-tile {
    grid-column: 1 / -1;
  }

  .tile-description {
    color: var(--text);
    margin-bottom: 1rem;
    font-size: 0.9rem;
    font-style: italic;
    text-align: center;
  }

  .tile-preview {
    margin-bottom: 0;
    min-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder-content {
    opacity: 0.6;
    width: 100%;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: var(--text);
    font-style: italic;
  }

  .real-diagram {
    width: 100%;
    height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .real-diagram :global(svg) {
    width: 100%;
    height: 100%;
    max-width: 600px;
    max-height: 280px;
  }

  /* Make diagram text larger and more readable */
  .real-diagram :global(.title) {
    font-size: 28px !important;
    font-weight: 600 !important;
  }

  .real-diagram :global(.emoji) {
    font-size: 28px !important;
  }

  /* Responsive adjustments for real diagram */
  @media (max-width: 1000px) {
    .real-diagram :global(svg) {
      width: 500px;
      height: 220px;
    }
  }

  @media (max-width: 600px) {
    .real-diagram :global(svg) {
      width: 400px;
      height: 200px;
    }
    
    .real-diagram :global(.title) {
      font-size: 24px !important;
    }
    
    .real-diagram :global(.emoji) {
      font-size: 24px !important;
    }
  }

  /* Relationship Map Placeholder */
  .placeholder-diagram {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    gap: 2rem;
  }

  .placeholder-node {
    width: 96px;
    height: 96px;
    border: 2px dashed var(--input-border);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--text);
    text-align: center;
    padding: 0.3rem;
  }

  .placeholder-connection {
    flex: none;
    width: 60px;
    height: 2px;
    background: var(--input-border);
    margin: 0;
    position: relative;
  }

  .placeholder-connection::after {
    content: '';
    position: absolute;
    right: -6px;
    top: -4px;
    width: 0;
    height: 0;
    border-left: 8px solid var(--input-border);
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
  }

  /* North Star Placeholder */
  .placeholder-star {
    position: relative;
    width: 384px;
    height: 288px;
    margin: 0 auto;
  }

  .star-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 120px;
    height: 60px;
    border: 2px dashed var(--input-border);
    border-radius: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--text);
    text-align: center;
    padding: 0.3rem;
  }

  /* Style real North Star center to match diagram nodes */
  .star-center.real-northstar-text {
    background: var(--input-bg);
    border: 1.5px solid var(--input-border);
    border-radius: 12px;
    width: 121px;
    height: 71.5px;
    padding: 0.4rem;
    font-size: 0.65rem !important;
    line-height: 1.2;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }

  .star-point {
    position: absolute;
    width: 78px;
    height: 34px;
    border: 1px dashed var(--input-border);
    border-radius: 17px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--text);
    text-align: center;
    padding: 0.3rem;
  }

  /* Style real North Star points to match diagram nodes */
  .star-point.real-northstar-text {
    background: var(--input-bg);
    border: 1.5px solid var(--input-border);
    border-radius: 12px;
    width: 110px;
    height: 65px;
    padding: 0.4rem;
    line-height: 1.1;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    text-align: left;
  }

  /* Make north/south boxes wider to extend beyond essence box */
  .star-point.north.real-northstar-text,
  .star-point.south.real-northstar-text {
    width: 135px;
  }

  /* Make east/west boxes narrower and taller */
  .star-point.east.real-northstar-text,
  .star-point.west.real-northstar-text {
    width: 95px;
    height: 92px;
  }

  .star-point.real-northstar-text div {
    margin-bottom: 0.2rem;
  }

  .star-point.north { top: 35px; left: 50%; transform: translateX(-50%); }
  .star-point.east { right: 5px; top: 50%; transform: translateY(-50%); }
  .star-point.south { bottom: 35px; left: 50%; transform: translateX(-50%); }
  .star-point.west { left: 5px; top: 50%; transform: translateY(-50%); }

  /* Adjust positioning for loaded North Star data */
  .placeholder-star:has(.real-northstar-text) {
    width: 420px;
    height: 320px;
    margin-left: -20px;
  }

  /* Center North Star diagram in mobile views */
  @media (max-width: 600px) and (min-width: 401px) {
    .placeholder-star:has(.real-northstar-text) {
      margin-left: 50px !important;
    }
  }

  @media (max-width: 400px) {
    .placeholder-star:has(.real-northstar-text) {
      margin-left: 0 !important;
    }
  }

  .placeholder-star:has(.real-northstar-text) .star-point.north { top: 20px; }
  .placeholder-star:has(.real-northstar-text) .star-point.east { right: 13px; }
  .placeholder-star:has(.real-northstar-text) .star-point.south { bottom: 20px; }
  .placeholder-star:has(.real-northstar-text) .star-point.west { left: 13px; }

  /* Make real North Star data text 50% smaller and white */
  .real-northstar-text {
    font-size: 0.5rem !important;
    color: white !important;
  }

  /* Style direction headings */
  .direction-heading {
    font-weight: bold;
    font-size: 0.45rem !important;
    margin-bottom: 0.1rem;
    color: #888 !important;
    text-align: center !important;
    width: 100%;
    display: block;
  }

  /* Experiment Placeholder */
  .placeholder-experiment {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
  }

  .experiment-step {
    width: 102px;
    height: 54px;
    border: 2px dashed var(--input-border);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--text);
    text-align: center;
    padding: 0.3rem;
  }

  .experiment-arrow {
    color: var(--input-border);
    font-weight: bold;
  }


  @media (max-width: 1000px) {
    .container {
      padding-left: 0;
      padding-right: 0;
    }
    
    .dashboard-header {
      padding-left: 1rem;
      padding-right: 1rem;
    }
    
    .dashboard-grid {
      grid-template-columns: 1fr;
      padding-left: 1rem;
      padding-right: 1rem;
    }
    
    .placeholder-diagram {
      flex-direction: row;
      gap: 0.5rem;
      padding: 0.5rem;
      justify-content: center;
    }
    
    .placeholder-node {
      width: 72px;
      height: 72px;
      font-size: 0.78rem;
    }
    
    .placeholder-connection {
      flex: none;
      width: 30px;
      height: 2px;
      margin: 0;
      align-self: center;
    }
    
    .placeholder-connection::after {
      right: -6px;
      top: -4px;
      border-left: 8px solid var(--input-border);
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
    }
  }

  @media (max-width: 600px) {
    .container {
      padding-left: 0;
      padding-right: 0;
    }
    
    .dashboard-header {
      padding-left: 1rem;
      padding-right: 1rem;
    }
    
    .dashboard-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
      padding-left: 1rem;
      padding-right: 1rem;
    }
    
    .dashboard-tile {
      padding: 1rem;
    }
    
    .placeholder-node {
      width: 72px;
      height: 72px;
      font-size: 0.72rem;
    }
    
    .placeholder-diagram {
      padding: 0.25rem;
    }
    
    .experiment-step {
      width: 78px;
      height: 42px;
      font-size: 0.84rem;
    }
    
    .placeholder-experiment {
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem;
      align-items: center;
    }
    
    .experiment-arrow {
      transform: rotate(90deg);
    }
    
    .placeholder-star {
      width: 312px;
      height: 240px;
    }
    
    .star-center {
      width: 96px;
      height: 48px;
      font-size: 0.84rem;
    }
    
    .star-point {
      width: 66px;
      height: 29px;
      font-size: 0.84rem;
    }
    
    .star-point.north { top: 15px; }
    .star-point.east { right: 2px; }
    .star-point.south { bottom: 15px; }
    .star-point.west { left: 2px; }
  }

  .delete-account-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--input-border);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .delete-account-btn {
    background-color: var(--brand-primary);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 0.9em;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .delete-account-btn:hover {
    background-color: #8a3a32;
  }

  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal {
    background-color: var(--bg);
    padding: 2rem;
    border-radius: 8px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .modal h3 {
    margin-top: 0;
    color: var(--heading);
  }

  .modal p {
    margin-bottom: 1rem;
    color: var(--text);
  }

  .modal-buttons {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .cancel-btn {
    background-color: var(--input-bg);
    color: var(--text);
    border: 1px solid var(--input-border);
  }

  .cancel-btn:hover {
    background-color: var(--input-border);
  }

  .confirm-delete-btn {
    background-color: var(--brand-primary);
    color: white;
  }

  .confirm-delete-btn:hover {
    background-color: #8a3a32;
  }

  .confirm-delete-btn:disabled,
  .cancel-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Relationship Map Modal Styles */
  .map-modal {
    background-color: var(--bg);
    border-radius: 12px;
    width: 95vw;
    height: 90vh;
    max-width: 1200px;
    max-height: 800px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .map-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--input-border);
    background-color: var(--card-bg, #1a1a1a);
  }

  .map-modal-header h2 {
    margin: 0;
    color: var(--heading);
    font-size: 1.5rem;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    color: var(--text);
    cursor: pointer;
    padding: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s ease;
  }

  .close-btn:hover {
    background-color: var(--input-border);
  }

  .map-modal-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .map-modal-content.no-hover {
    pointer-events: none;
  }

  .full-screen-diagram {
    flex: 1;
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg);
  }

  .full-screen-diagram :global(svg) {
    width: 100%;
    height: 100%;
    max-width: 800px;
    max-height: 400px;
  }

  .full-screen-diagram :global(.title) {
    font-size: 36px !important;
    font-weight: 600 !important;
  }

  .full-screen-diagram :global(.emoji) {
    font-size: 36px !important;
  }

  /* Modal Side Tray Styles */
  .modal-backdrop-tray {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999;
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .modal-side-tray {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    width: 360px;
    max-width: 40%;
    z-index: 20;
    background-color: var(--bg);
    border-left: 1px solid var(--input-border);
    padding: 20px;
    overflow-y: auto;
    box-shadow: -4px 0 8px rgba(0, 0, 0, 0.2);
  }

  .tray-close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    color: var(--text);
    font-size: 1.2em;
    cursor: pointer;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s ease;
  }

  .tray-close-btn:hover {
    background-color: var(--input-border);
  }

  .modal-side-tray h3 {
    margin-top: 0;
    color: var(--heading);
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .tray-description {
    font-size: 1.1em;
    margin-bottom: 1rem;
    color: var(--text);
    line-height: 1.4;
  }

  .tray-status {
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tray-status-label {
    font-weight: 600;
    color: var(--text);
  }

  .status-indicator {
    display: inline-block;
    padding: 0.4rem 0.8rem;
    border-radius: 16px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .status-on-track {
    background-color: rgba(34, 197, 94, 0.2);
    color: #22c55e;
    border: 1px solid #22c55e;
  }

  .status-strained {
    background-color: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid #ef4444;
  }

  .tray-insights {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .tray-insight-item {
    background-color: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 1rem;
    margin: 0;
  }

  .tray-insight-label {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--heading);
    font-size: 1.1em;
  }

  .tray-insight-text {
    color: var(--text);
    line-height: 1.4;
  }

  /* Mobile responsiveness for modal */
  @media (max-width: 768px) {
    .map-modal {
      width: 100vw;
      height: 100vh;
      max-width: none;
      max-height: none;
      border-radius: 0;
    }

    .map-modal-content {
      flex-direction: column;
    }

    .full-screen-diagram {
      flex: 1;
      padding: 1rem;
    }

    .modal-side-tray {
      width: 100vw;
      max-width: none;
    }

    .full-screen-diagram :global(.title) {
      font-size: 28px !important;
    }

    .full-screen-diagram :global(.emoji) {
      font-size: 28px !important;
    }
  }

  /* North Star Modal Styles */
  .northstar-modal {
    background-color: var(--bg);
    border-radius: 12px;
    width: 95vw;
    height: 90vh;
    max-width: 1200px;
    max-height: 800px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .northstar-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--input-border);
    background-color: var(--card-bg, #1a1a1a);
  }

  .northstar-modal-header h2 {
    margin: 0;
    color: var(--heading);
    font-size: 1.5rem;
  }

  .northstar-modal-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .full-screen-northstar {
    flex: 1;
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg);
  }

  .northstar-diagram {
    position: relative;
    width: 700px;
    height: 550px;
    margin: 0 auto;
  }

  .star-center-large {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 180px;
    height: 100px;
    background: var(--input-bg);
    border: 2px solid var(--input-border);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    color: white;
    text-align: center;
    padding: 1rem;
    line-height: 1.3;
  }

  .star-point-large {
    position: absolute;
    background: var(--input-bg);
    border: 2px solid var(--input-border);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    text-align: left;
    padding: 1rem;
    color: white;
  }

  .star-point-large.north-large {
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 220px;
    height: 110px;
  }

  .star-point-large.east-large {
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    width: 160px;
    height: 150px;
  }

  .star-point-large.south-large {
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 220px;
    height: 110px;
  }

  .star-point-large.west-large {
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    width: 160px;
    height: 150px;
  }

  .direction-heading-large {
    font-weight: bold;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    color: #888;
    text-align: center;
    width: 100%;
    display: block;
  }

  .star-item-large {
    margin-bottom: 0.3rem;
    font-size: 0.85rem;
    line-height: 1.2;
  }

  /* Mobile responsiveness for North Star modal */
  @media (max-width: 768px) {
    .northstar-modal {
      width: 100vw;
      height: 100vh;
      max-width: none;
      max-height: none;
      border-radius: 0;
    }

    .northstar-diagram {
      width: 450px;
      height: 400px;
    }

    .star-center-large {
      width: 140px;
      height: 80px;
      font-size: 0.9rem;
      padding: 0.8rem;
    }

    .star-point-large.north-large,
    .star-point-large.south-large {
      width: 160px;
      height: 80px;
    }

    .star-point-large.east-large,
    .star-point-large.west-large {
      width: 110px;
      height: 110px;
    }

    .direction-heading-large {
      font-size: 0.8rem;
    }

    .star-item-large {
      font-size: 0.75rem;
    }
  }
</style>
