<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount, tick } from 'svelte';
  import { auth, user } from '$lib/stores/auth';
  import Diagram from "$lib/components/diagramConnection.svelte";
  import StarRating from "$lib/components/StarRating.svelte";
  import { writable } from 'svelte/store';
  export const toast = writable<string | null>(null);

  type Rel = {
    name: string;
    description: string;
    status: 'on track' | 'strained';
    details: { '+': string; '∆': string; '→': string };
  };

  let experimentModalContent: HTMLDivElement | null = null;
  let email = '';
  let password = '';
  let confirmPassword = '';
  let hasPassword = false;
  let showPasswordFields = false;
  let passwordError = '';
  let checkingPassword = false;
  let authLoading = false;
  let mapData: any = null;
  let loadingMap = false;
  let northStarData: any = null;
  let loadingNorthStar = false;
  let experimentsData: any = null;
  let loadingExperiments = false;
  let emailError = '';
  let emailInput: HTMLInputElement;
  let passwordInput: HTMLInputElement | null = null;
  let confirmInput: HTMLInputElement | null = null;
  let pendingOpenDrawer = false;
  let showEmailInput = true;
  let pendingSelectId: string | null = null;
  let authReady = false;
  let passwordStatusResolved = false;

  // modal flags
  let showExperimentModal = false;

  // Experiment modal state
  let experimentText = '';
  let experimentLoading = false;
  let experimentError: string | null = null;
  let experimentResult: any = null;
  let experimentTextLimitReached = false;
  
  // Password visibility state
  let showPassword = false;
  let showConfirmPassword = false;

  // Delete account state
  let showDeleteConfirmation = false;
  let deletingAccount = false;

  // debounce
  let debounceTimer: NodeJS.Timeout | null = null;

  function showToast(message: string) {
    toast.set(message);
    setTimeout(() => toast.set(null), 4000); // auto-hide after 4 s
  }
  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  function isValidPassword(password: string): boolean {
    return password.length >= 8;
  }

  function doPasswordsMatch(): boolean {
    return password === confirmPassword;
  }

  // Function to check if user has a password
  async function checkPasswordStatus() {
    if (!isValidEmail(email) || checkingPassword) return;
    
    checkingPassword = true;
    try {
      hasPassword = await auth.checkHasPassword(email);
      showPasswordFields = true;
    } catch (error) {
      console.error('Error checking password status:', error);
    } finally {
      checkingPassword = false;
      passwordStatusResolved = true;
    }
  }

  async function handleAuth() {
    if (!isValidEmail(email)) { emailError = 'Please enter a valid email'; emailInput?.focus(); return; }
    
    // Check if user needs to create a password
    if (!showPasswordFields) {
      if (checkingPassword) return;
      await checkPasswordStatus();
      return;
    }
    
    // Handle authentication
    if (hasPassword) {
      // Login
      if (!password) {
        passwordError = 'Please enter your password';
        await tick();
        passwordInput?.focus();
        return;
      }
      
      authLoading = true;
      const result = await auth.login(email, password);
      authLoading = false;
      
      if (!result.success) {
        passwordError = result.error || 'Login failed';
        return;
      }
    } else {
      // Register
      if (!isValidPassword(password)) {
        passwordError = 'Password must be at least 8 characters';
        await tick();
        passwordInput?.focus();
        return;
      }
      
      if (!doPasswordsMatch()) {
        passwordError = 'Passwords do not match';
        await tick();
        confirmInput?.focus();
        return;
      }
      
      authLoading = true;
      const result = await auth.register(email, password, confirmPassword);
      authLoading = false;
      
      if (!result.success) {
        passwordError = result.error || 'Registration failed';
        return;
      }
    }
    
    window.location.replace(`/?email=${encodeURIComponent(email)}`);
  }

  function handleLfgNorthStar() {
    if (!isValidEmail(email)) { emailError = 'Please enter a valid email'; emailInput?.focus(); return; }
    if (!mapData) return; // progressive unlock: needs a map first
    goto(`/createNorthStar?email=${encodeURIComponent(email)}`);
  }


  function handleLfgExperiments() {
    if (!isValidEmail(email)) { emailError = 'Please enter a valid email'; emailInput?.focus(); return; }
    
    // If user has both map and north star, go to the designExperiment page
    if (mapData && northStarData) {
      goto(`/designExperiment?email=${encodeURIComponent(email)}`);
    } else {
      // Otherwise show the experiment modal
      showExperimentModal = true;
    }
  }
  function mapTileClickable() {
    // Only clickable if user is authenticated (has password and is logged in)
    return isValidEmail(email) && !mapData && $user && $user.authenticated;
  }
  function northStarTileClickable() {
    // Only clickable if user is authenticated and has a map but no north star
    return isValidEmail(email) && mapData && !northStarData && $user && $user.authenticated;
  }
  function experimentsTileClickable() {
    // Only clickable if user is authenticated
    return isValidEmail(email) && $user && $user.authenticated;
  }

  function tileKeyActivate(e: KeyboardEvent, handler: () => void) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  }

  async function checkForExistingMap() {
    if (!email.trim()) { mapData = null; return mapData; }
    loadingMap = true;
    try {
      const res = await fetch(`/api/relationships?ownerEmail=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        mapData = data.length > 0 ? data[0] : null;
      } else {
        mapData = null;
      }
      return mapData;
    } catch (e) {
      mapData = null;
      return mapData;
    } finally {
      loadingMap = false;
    }
  }

  $: if (mapData && pendingOpenDrawer) {
    // Wait a moment to ensure the UI is ready
    setTimeout(() => {
      openMapDrawerFor(pendingSelectId || 'connection');
      pendingOpenDrawer = false;
      pendingSelectId = null;

      // Clean the URL so refresh doesn't re-open
      const url = new URL(window.location.href);
      url.searchParams.delete('openModal');
      url.searchParams.delete('selectNode');
      history.replaceState(null, '', url.toString());
    }, 100);
  }

  async function checkForExistingNorthStar() {
    if (!email.trim()) { northStarData = null; return northStarData; }
    loadingNorthStar = true;
    try {
      const res = await fetch(`/api/northStar?ownerEmail=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        northStarData = data.length > 0 ? data[0] : null;
      } else {
        northStarData = null;
      }
      return northStarData;
    } catch (e) {
      northStarData = null;
      return northStarData;
    } finally {
      loadingNorthStar = false;
    }
  }

  async function checkForExistingExperiments() {
    if (!email.trim()) { experimentsData = null; return experimentsData; }
    loadingExperiments = true;
    try {
      const res = await fetch(`/api/experiments?ownerEmail=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          experimentsData = data;
        } else {
          experimentsData = null;
        }
      } else {
        experimentsData = null;
      }
      return experimentsData;
    } catch (e) {
      experimentsData = null;
      return experimentsData;
    } finally {
      loadingExperiments = false;
    }
  }

  // Escape to close open modal
  
  function handleEscapeKey(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    if (showExperimentModal) {
      showExperimentModal = false;
      experimentText = '';
      experimentError = null;
      experimentResult = null;
    } else if (showDeleteConfirmation) {
      showDeleteConfirmation = false;
    }
  }

  // --- Global "nudge" to require a valid email on any input ---
  function nudgeForEmail(event: Event) {
    // Only nudge if email is not valid
    if (isValidEmail(email)) return;

    // Ignore interactions that originate on the email input itself
    const path = (event as any).composedPath?.() ?? [];
    const isOnEmail = path.includes(emailInput) || document.activeElement === emailInput;
    if (isOnEmail) return;

    // Show error + focus email
    emailError = 'Please enter a valid email';
    emailInput?.focus();
  }
  
  function clickIsInsidePasswordArea(ev: Event) {
    const path = (ev as any).composedPath?.() ?? [];
    return path.includes(passwordInput) || path.includes(confirmInput) || path.includes(emailInput);
  }

  async function handleGlobalPointerDown(ev: PointerEvent) {
    if (!showPasswordFields) return;

    if (hasPassword && !password && !clickIsInsidePasswordArea(ev)) {
      passwordError = 'Please enter your password';
      await tick();
      passwordInput?.focus();
      return;
    }
    if (!hasPassword && (!password || !confirmPassword) && !clickIsInsidePasswordArea(ev)) {
      passwordError = 'Please create and confirm your password';
      await tick();
      (password ? confirmInput : passwordInput)?.focus();
    }
  }

  // --- drawer state for the Map tile ---
  type Node = {
    id: string;
    label: string;
    desc?: string;
    name?: string;
    description?: string;
    status?: "on track" | "strained";
    details?: Record<string, string>;
    x: number; y: number; width?: number; height?: number;
  };

  let showMapDrawer = false;
  let selectedNode: Node | null = null;

  function handleNodeSelect(node: Node) {
    // ignore the "You" node (open only for the connection)
    if (node?.id === 'you') return;
    selectedNode = node;
    showMapDrawer = true;
  }

  function closeMapDrawer() {
    showMapDrawer = false;
    selectedNode = null;
  }

  onMount(() => {
    // Check for existing flash message(s)
    const flashMsg = localStorage.getItem('flash');
    if (flashMsg) {
      showToast(flashMsg);
      localStorage.removeItem('flash');
    }
    //  Check for existing session
    auth.checkSession().then(() => {
      authReady = true;
      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email');
      
      // If authenticated, use session email and load data
      if ($user && $user.authenticated && $user.email) {
        email = $user.email;
        showEmailInput = false; // Hide email input for authenticated users
        
        // Load data and then check if we should show the experiment modal
        Promise.all([
          checkForExistingMap(),
          checkForExistingNorthStar(),
          checkForExistingExperiments()
        ]).then(() => {
          // Auto-trigger experiment modal if user doesn't have both map and north star
          // We want to encourage users to create experiments even if they haven't created map/north star
          if (isValidEmail(email) && (!mapData || !northStarData) && !experimentsData) {
            // Short timeout to ensure UI is ready
            setTimeout(() => {
              showExperimentModal = true;
            }, 500);
          }
        });
        
        // Check URL params for modal opening
        const openModal = urlParams.get('openModal');
        const selectNode = urlParams.get('selectNode');
        
        // Set pending flags to open the appropriate modal/drawer when data is loaded
        if (openModal === 'map' || openModal === 'true') {
          pendingOpenDrawer = true;
          pendingSelectId = selectNode || 'connection';
        }
      } 
      // If not authenticated but URL has email, just pre-fill the field
      else if (emailParam) {
        email = emailParam;
        // Check if this email has a password
        if (isValidEmail(email)) {
          checkPasswordStatus();
        }
      }
    });

    // Set up escape key handler
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  });

  function debouncedCheckData() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (email && isValidEmail(email)) {
        // Only make API calls if authenticated
        if ($user && $user.authenticated) {
          checkForExistingMap();
          checkForExistingNorthStar();
          checkForExistingExperiments();
        } else {
          // Check if user has password when email is valid
          checkPasswordStatus();
        }
        saveUserEmail();
      }
    }, 800);
  }

  function openMapDrawerFor(id: string) {
    if (!mapData) return;

    // Your diagram uses ids: 'you' and 'connection'
    if (id === 'connection') {
      selectedNode = {
        id: 'connection',
        label: mapData.name,
        name: mapData.name,
        desc: mapData.description,
        description: mapData.description,
        status: mapData.status,
        details: mapData.details,
        x: 0, y: 0 // not used by the drawer
      };
      showMapDrawer = true;
    }
  }

  $: if (email) {
    debouncedCheckData();
  } else {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    mapData = null;
    northStarData = null;
    experimentsData = null;
  }
  
  $: if (showExperimentModal) {
    tick().then(() => {
      experimentModalContent?.scrollTo({ top: 0, behavior: 'smooth' });
    });
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
        localStorage.setItem('flash', 'Account deleted');
        window.location.replace('/');      } else {
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
          if (!res2.ok) {
            console.error('Save failed:', saved?.error);
          } else {
            // Update the experimentResult with the saved experiment ID and other DB fields
            experimentResult = { ...experimentResult, id: saved.id, createdAt: saved.createdAt, updatedAt: saved.updatedAt };
            // Refresh the experiments list
            checkForExistingExperiments();
          }
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

<svelte:window on:pointerdown={handleGlobalPointerDown} />

<main class="container">
  <div class="dashboard-header">
    <h2>TEND<br /><span style="font-size: 0.8em; font-style: italic; color: var(--text);">nurture your connections</span></h2>

    {#if showEmailInput}
      <label for="owner-email">Email:</label>
      <input
        type="email"
        bind:value={email}
        bind:this={emailInput}
        on:input={() => { 
          emailError = ''; 
          passwordError = '';
          showPasswordFields = false;
          hasPassword = false;
          password = '';
          confirmPassword = '';
        }}
        placeholder="Enter your email"
        class:error={emailError}
        disabled={authLoading}
      />
      {#if emailError}<div class="error-message">{emailError}</div>{/if}
    {/if}
    
    {#if showPasswordFields}
      {#if hasPassword}
        <!-- Login form -->
       <br>
       <div class="password-field-row">
         <label for="password">Password:</label>
         <div class="password-input-container">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            bind:value={password}
            bind:this={passwordInput}
            on:input={() => { passwordError = ''; }}
            placeholder="Enter your password"
            class:error={passwordError}
            disabled={authLoading}
          />
          <button 
            type="button" 
            class="toggle-password" 
            on:click={() => showPassword = !showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
       </div>
        {#if passwordError}<div class="error-message">{passwordError}</div>{/if}
        <button 
          class="auth-button" 
          on:click={handleAuth} 
          disabled={authLoading || !isValidEmail(email) || !password}
        >
          {authLoading ? 'Logging in...' : 'Login'}
        </button>
      {:else}
        <!-- Registration form -->
        <br>
        <div class="password-field-row">
          <label for="password">Create Password:</label>
          <div class="password-input-container">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            bind:value={password}
            bind:this={passwordInput}
            on:input={() => { passwordError = ''; }}
            placeholder="Create a password (min 8 characters)"
            class:error={passwordError}
            disabled={authLoading}
          />
          <button 
            type="button" 
            class="toggle-password" 
            on:click={() => showPassword = !showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
        </div>
        <div class="password-field-row">
          <label for="confirm-password">Confirm Password:</label>
          <div class="password-input-container">
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirm-password"
            bind:value={confirmPassword}
            bind:this={confirmInput}
            on:input={() => { passwordError = ''; }}
            placeholder="Confirm your password"
            class:error={passwordError}
            disabled={authLoading}
          />
          <button 
            type="button" 
            class="toggle-password" 
            on:click={() => showConfirmPassword = !showConfirmPassword}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? "🙈" : "👁️"}
          </button>
        </div>
        </div>
        {#if passwordError}<div class="error-message">{passwordError}</div>{/if}
        <button 
          class="auth-button" 
          on:click={handleAuth} 
          disabled={authLoading || !isValidEmail(email) || !password || !confirmPassword}
        >
          {authLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      {/if}
    {:else if isValidEmail(email) && showEmailInput && authReady && passwordStatusResolved && !$user?.authenticated}
      <div class="lfg-button-container">
        <button 
          class="lfg-button auth-lfg" 
          on:click={handleAuth}
          disabled={authLoading || !isValidEmail(email) || showPasswordFields}
        >
          LFG
        </button>
      </div>
    {/if}
  </div>

  <div class="dashboard-grid">
    <!-- Relationship Map Tile -->
    <div 
      class="dashboard-tile" 
      class:masked={isValidEmail(email) && !mapData} 
      class:clickable={mapTileClickable()}
      role={mapTileClickable() ? 'button' : undefined}
      tabindex={mapTileClickable() ? 0 : undefined}
      aria-label={mapTileClickable() ? 'Create your relationship map' : undefined}
      on:click={mapTileClickable() ? () => goto('/mapConnection') : undefined}
      on:keydown={mapTileClickable() ? (e) => tileKeyActivate(e, () => goto('/mapConnection')) : undefined}
      data-tile="map"
    >
      <div class="tile-header">
        <h3>🗺️ Relationship Map</h3>
        {#if isValidEmail(email) && !mapData}
          {#if $user && $user.authenticated}
            <button class="lfg-button" on:click|stopPropagation={() => goto('/mapConnection')} aria-label="Create your relationship map">LFG</button>
          {:else}
            <button class="lock-icon" on:click|stopPropagation={() => { checkPasswordStatus(); emailInput?.focus(); }} title="Please enter your password to unlock" aria-label="Locked - enter password to unlock">🔒</button>
          {/if}
        {/if}    
      </div>
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
                on:nodeSelect={(e) => handleNodeSelect(e.detail)}
              />
              {#if showMapDrawer && selectedNode}
                <div class="map-drawer-backdrop" on:click={closeMapDrawer} />
                <aside
                  class="map-drawer"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Connection details"
                  tabindex="-1"
                  on:keydown={(e) => e.key === 'Escape' && closeMapDrawer()}
                >
                  <header class="map-drawer-header">
                    <h4>{selectedNode.name ?? selectedNode.label}</h4>
                    <button class="close-btn" on:click={closeMapDrawer} aria-label="Close">×</button>
                  </header>
                  <div class="map-drawer-body">
                    {#if selectedNode.status}
                      <div class="row"><strong>Status:</strong> {selectedNode.status}</div>
                    {/if}
                    {#if selectedNode.description}
                      <div class="row"><strong>Vibe:</strong> {selectedNode.description}</div>
                    {/if}
                    {#if selectedNode.details}
                      <div class="row"><strong>Details:</strong></div>
                      <ul class="details">
                        {#if selectedNode.details['+']}<li>+ | {selectedNode.details['+']}</li>{/if}
                        {#if selectedNode.details['∆']}<li>∆ | {selectedNode.details['∆']}</li>{/if}
                        {#if selectedNode.details['→']}<li>→ | {selectedNode.details['→']}</li>{/if}
                      </ul>
                    {/if}
                  </div>
                </aside>
              {/if}
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
    <div 
      class="dashboard-tile" 
      class:locked={isValidEmail(email) && !mapData} 
      class:masked={isValidEmail(email) && !northStarData}
      class:clickable={northStarTileClickable()}
      role={northStarTileClickable() ? 'button' : undefined}
      tabindex={northStarTileClickable() ? 0 : undefined}
      aria-label={northStarTileClickable() ? 'Create your north star' : undefined}
      on:click={northStarTileClickable() ? handleLfgNorthStar : undefined}
      on:keydown={northStarTileClickable() ? (e) => tileKeyActivate(e, handleLfgNorthStar) : undefined}
      data-tile="northstar"
    >
      <div class="tile-header">
        <h3>⭐ North Star</h3>
        {#if isValidEmail(email) && mapData && !northStarData}
          {#if $user && $user.authenticated}
            <button class="lfg-button" on:click|stopPropagation={handleLfgNorthStar} aria-label="Create your north star">LFG</button>
          {:else}
            <button class="lock-icon" on:click|stopPropagation={() => { checkPasswordStatus(); emailInput?.focus(); }} title="Please enter your password to unlock" aria-label="Locked - enter password to unlock">🔒</button>
          {/if}
        {/if}    
      </div>
      <div class="tile-content">
        <p class="tile-description">Set your direction</p>
        <div class="tile-preview">
          {#if loadingNorthStar}
            <div class="loading-state">Loading...</div>
          {:else if northStarData}
            <div class="northstar-grid-container">
              <div class="northstar-scroll-container">
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
    <div 
      class="dashboard-tile experiments-tile" 
      class:masked={isValidEmail(email) && !experimentsData} 
      class:clickable={experimentsTileClickable()}
      role={experimentsTileClickable() ? 'button' : undefined}
      tabindex={experimentsTileClickable() ? 0 : undefined}
      aria-label={experimentsTileClickable() ? 'Create your first experiment' : undefined}
      on:click={experimentsTileClickable() ? handleLfgExperiments : undefined}
      on:keydown={experimentsTileClickable() ? (e) => tileKeyActivate(e, handleLfgExperiments) : undefined}
      data-tile="experiments"
    >
      <div class="tile-header">
        <h3>🧪 Experiments</h3>
        {#if isValidEmail(email)}
          {#if $user && $user.authenticated}
            <button class="lfg-button" on:click|stopPropagation={handleLfgExperiments} aria-label="Create a new experiment">
              {experimentsData && experimentsData.length > 0 ? 'Create New' : 'LFG'}
            </button>
          {:else}
            <button class="lock-icon" on:click|stopPropagation={() => { checkPasswordStatus(); emailInput?.focus(); }} title="Please enter your password to unlock" aria-label="Locked - enter password to unlock">🔒</button>
          {/if}
        {/if}    
      </div>
      <div class="tile-content">
        <p class="tile-description">Small steps, radical intent, real progress</p>
        <div class="tile-preview">
          {#if loadingExperiments}
            <div class="loading-state">Loading...</div>
          {:else if experimentsData && experimentsData.length > 0}
            <div class="experiments-grid-container">
              <div class="experiments-grid narrow-view">
                <div class="experiments-scroll-container">
                  <table class="experiments-table" style="--exp-count: {experimentsData.length}">
                    <colgroup>
                      <col class="col-step" />
                      {#each experimentsData as _}
                        <col class="col-exp" />
                      {/each}
                    </colgroup>
                    <thead>
                      <tr>
                        <th class="step-header"></th>
                        {#each experimentsData as experiment, index}
                          <th class="experiment-header" class:completed={experiment.learnings}>
                            <div class="experiment-number">{index + 1}</div>
                            <div class="experiment-date">{new Date(experiment.createdAt).toLocaleDateString()}</div>
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
                        <td class="step-label">Rating</td>
                        {#each experimentsData as experiment}
                          <td class="experiment-cell rating-cell" on:click|stopPropagation>
                            <StarRating 
                              rating={experiment.rating} 
                              experimentId={experiment.id} 
                              ownerEmail={email} 
                              size="small" 
                              readonly={false}
                            />
                          </td>
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

  {#if $toast}
    <div class="toast">{$toast}</div>
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

<!-- Experiment Modal -->
{#if showExperimentModal}
  <div class="modal-backdrop" on:click={() => (showExperimentModal = false)} on:keydown={(e) => e.key === 'Escape' && (showExperimentModal = false)} role="dialog" aria-modal="true" tabindex="-1">
    <div class="experiment-modal" role="document" on:click|stopPropagation>
      <div class="experiment-modal-header">
        <h2>🧪 Design your first experiment!</h2>
        <button class="close-btn" on:click={() => (showExperimentModal = false)} aria-label="Close modal">×</button>
      </div>
      <div class="experiment-modal-content" bind:this={experimentModalContent}>
        <div class="experiment-form">
          <p style="font-style: italic; margin-top: 1rem;">
            Experiments are the heart of how TEND helps you make progress. Small shifts right in the moment you're facing important challenges can lead to signficant improvements in how you relate to yourself and others.
          </p>
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

            <div style="margin-bottom: 1rem;">
              <h3 style="margin-bottom: 0.5rem; color: var(--heading); text-align: center;">Rate this experiment</h3>
              <div style="display: flex; justify-content: center; margin-top: 0.5rem;">
                <StarRating 
                  rating={experimentResult.rating} 
                  experimentId={experimentResult.id} 
                  ownerEmail={email} 
                  size="large" 
                />
              </div>
            </div>

            <h2>Want experiments more tailored to you?</h2>
            <p style="font-style: italic; margin-top: 1rem; text-align: center;">
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

  .container { padding: 0 1rem; }
  
  /* Auth styles */
  .auth-button {
    width: 100%;
    padding: 0.75rem;
    background: var(--button-bg);
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 0.5rem;
    transition: background-color 0.2s ease;
  }
  
  .auth-button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  .dashboard-header { margin-bottom: 2rem; }
  .dashboard-header input { margin-top: 0.5rem; max-width: 300px; }
  .dashboard-header input.error { border-color: #ff4444; box-shadow: 0 0 0 2px rgba(255,68,68,.2); }
  .error-message {
    color: var(--error);
    font-size: 0.8em;
    margin-top: 0.2em;
  }
  
  /* CSS for logged-in state is handled by the header component */

  .dashboard-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 2rem; }

  .dashboard-tile {
    background: var(--card-bg, #1a1a1a);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 1rem;
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
  .dashboard-tile.clickable { cursor: pointer; }
  .dashboard-tile.clickable:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.3); border: 3px solid white; }

  [data-tile] .lfg-button,
  [data-tile] .lock-icon {
    position: absolute; top: 12px; left: 12px; z-index: 2;
  }
  .auth-lfg { position: static; }
  .lfg-button {
    font-family: 'Mulish', sans-serif; font-weight: 600; font-size: 1em;
    padding: 8px 16px; border: none; border-radius: 4px; background-color: var(--button-bg); color: #fff;
    pointer-events: auto; cursor: pointer;
  }
  .lfg-button:focus { outline: 2px solid var(--button-hover); outline-offset: 2px; }

  .lock-icon { font-size: 1.5em; color: #888; }

  .tile-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
  .tile-header h3 { grid-column: 2; justify-self: center;margin: 0; color: var(--heading); text-align: center; }
  .tile-header .header-spacer { grid-column: 1; width: 0; }
  .tile-header .lfg-button, .tile-header .lock-icon  { grid-column: 3; position: static; max-width: 50%; min-width: 80px; justify-self: center; }
  .tile-description { color: var(--text); margin-bottom: 1rem; font-size: .9rem; font-style: italic; text-align: center; }

  .tile-preview {
    min-height: 280px; display:flex; align-items:center; justify-content:center;
    width: 100%; max-width: 100%;
    overflow-x: visible;
  }
  .loading-state { display:flex; align-items:center; justify-content:center; padding: 2rem; color: var(--text); font-style: italic; }

  /* Diagram area must scale down to tile width */
  .diagram-container { width: 100%; max-width: 100%; overflow: hidden; }
  .diagram-container :global(svg) { display: block; max-width: 100%; height: auto; }

  /* Diagram typography */
  .diagram-container :global(.title) { font-size: 24px !important; font-weight: 600 !important; }
  .diagram-container :global(.emoji) { font-size: 24px !important; }

  /* Relationship Map Placeholder */
  .placeholder-diagram { display:flex; align-items:center; justify-content:center; padding: .5rem; gap: .5rem; }
  .placeholder-node { width: 72px; height: 72px; border: 2px dashed var(--input-border); border-radius: 50%; display:flex; align-items:center; justify-content:center; font-size: .78rem; color: var(--text); text-align:center; padding: .3rem; }
  .placeholder-connection { flex:none; width: 30px; height: 2px; background: var(--input-border); margin: 0; position: relative; }
  .placeholder-connection::after { content:''; position:absolute; right:-6px; top:-4px; border-left:8px solid var(--input-border); border-top:5px solid transparent; border-bottom:5px solid transparent; }

  /* Map tile must be positioning context */
  [data-tile="map"] { position: relative; }

  /* dim the diagram when drawer is open */
  .map-drawer-backdrop {
    position: absolute; inset: 0;
    background: rgba(0,0,0,.35);
    z-index: 3;
  }

  /* the drawer panel */
  .map-drawer {
    position: absolute; top: 0; right: 0;
    height: 100%;
    width: min(85%, 320px);
    background: var(--bg);
    border-left: 1px solid var(--input-border);
    box-shadow: -6px 0 16px rgba(0,0,0,.35);
    z-index: 4;
    display: flex; flex-direction: column;
    animation: mapDrawerIn .18s ease-out;
  }

  @keyframes mapDrawerIn { from { transform: translateX(12%); opacity:.6; } to { transform:none; opacity:1; } }

  .map-drawer-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:.1rem 0.75rem; border-bottom:1px solid var(--input-border);
  }
  .map-drawer-header h4 { margin:0; color:var(--heading); }
  .map-drawer-body { padding:.75rem 1rem; overflow:auto; }
  .map-drawer .close-btn { background:transparent; border:none; color:#fff; font-size:1.25rem; cursor:pointer; }

  .details { list-style-type: none;margin:.25rem 0 0; padding-left:1rem; }
  .details li { list-style-type: none; margin:.25rem 0; }

  
  /* North Star */
  
  /* Turn container into a 3x3 grid with center in the middle */
  .placeholder-star {
    display: grid;
    grid-template-columns: minmax(110px, 1fr) minmax(200px, 1fr) minmax(110px, 1fr);
    grid-template-rows: auto auto auto;
    grid-template-areas:
    ". north ."
    "west center east"
    ". south .";
    align-items: center;
    justify-items: center;
    gap: 0.75rem 1rem;

    width: 100%;
    height: auto;          
    margin: 0;
    padding: 0.5rem 0.75rem;
    position: relative;
    min-width: 300px;
  }
  
  /* Map each box to its grid area */
  .star-center { grid-area: center; }
  .star-point.north { grid-area: north; }
  .star-point.east  { grid-area: east; }
  .star-point.south { grid-area: south; }
  .star-point.west  { grid-area: west; }

  /* Remove absolute layout */
  .star-center,
  .star-point {
    position: static;
    transform: none;
  }

  /* Placeholder north star */
  .star-center {
    width: 96px; height: 48px;
    border: 2px dashed var(--input-border);
    border-radius: 30px;
    display:flex; align-items:center; justify-content:center;
    font-size:.84rem; color: var(--text); text-align:center; padding:.3rem;
  }
  .star-point {
    width: 66px; height: 29px;
    border: 1px dashed var(--input-border);
    border-radius: 17px;
    display:flex; align-items:center; justify-content:center;
    font-size:.84rem; color: var(--text); text-align:center; padding:.3rem;
}

/* Real north star (tile) */
.star-center.real-northstar-text,
.star-point.real-northstar-text {
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 12px;
  color: #fff;
  max-width: 100%;
  box-sizing: border-box;
  height: auto;
}

/* Center (haiku) */
.star-center.real-northstar-text {
  width: min(100%, clamp(120px, 26vw, 220px));
  min-height: 7.5em;
  padding: .5rem .6rem;
  font-size: clamp(.68rem, .46rem + .42vw, 1.05rem);
  line-height: 1.25;
  display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
}

/* Points (Growth / Vibe / Values / Avoid) */
.star-point.real-northstar-text {
  padding: .55rem .6rem;
  line-height: 1.2;
  display: flex; flex-direction: column; align-items: flex-start; text-align: left;
  word-wrap: break-word; overflow-wrap: anywhere;
  font-size: clamp(.54rem, .36rem + .33vw, .90rem);
}

/* North/South wider; East/West taller */
.star-point.real-northstar-text.north,
.star-point.real-northstar-text.south {
  width: min(100%, clamp(160px, 40vw, 280px));
  min-height: 7.2em;
}

.star-point.real-northstar-text.east,
.star-point.real-northstar-text.west {
  width: min(100%, clamp(120px, 28vw, 200px));
  min-height: 9em;
  align-self: stretch;
}

/* Point headings */
.direction-heading {
  font-weight: 700;
  font-size: clamp(.50rem, .34rem + .28vw, .82rem);
  margin-bottom: .25rem;
  color: #888;
  width: 100%;
  text-align: center;
}

  .northstar-grid-container {
    display: block;
    width: 100%;
    margin-inline: auto;
  }

  .northstar-scroll-container {
    display: block;
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .placeholder-content {
    display: block;
    width: auto;
    margin-inline: auto;
    max-width: 100%;
  }

  .placeholder-star {
    margin: 0;
  }

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
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    overflow: auto;
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

  .lock-icon {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--text);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .lock-icon:hover {
    background-color: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }

  .error { color: #ff6b6b; font-size: .9rem; margin-top: .5rem; }
  
  /* Password input styling */
  .password-field-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    width: 100%;
    max-width: 400px;
  }
  
  .password-field-row label {
    min-width: 130px;
    flex-shrink: 0;
  }
  
  .password-input-container {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    flex-grow: 1;
  }
  
  .password-input-container input {
    width: 100%;
    padding-right: 40px; /* Make room for the toggle button */
  }
  
  .toggle-password {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--text);
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }
  
  .toggle-password:hover {
    opacity: 1;
  }

  /* Experiments table */
  .experiments-grid-container { width: 100%; }
  .narrow-view { display: block; }
  .experiments-scroll-container { overflow-x: auto; overflow-y: visible; width: 100%; border: 1px solid var(--input-border); border-radius: 6px; }
  .experiments-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .col-step { width: 160px; }
  .col-exp  { width: 220px; }

  .experiments-table th.experiment-header,
  .experiments-table td.experiment-cell {
    width: auto;
    max-width: none;
  }

  .experiments-table .step-label {
    white-space: nowrap;
  }

  .rating-cell {
    display: table-cell;
    text-align: center;
    padding: .5rem .25rem;
    width: auto;
    min-width: 150px;
    max-width: 180px;
    box-sizing: border-box;
  }

  .rating-cell :global(.star-rating) {
    display: inline-flex;
    width: auto;
    max-width: none;
    flex: 0 0 auto;
  }
  .rating-cell :global(.stars-container) {
    width: auto;
    justify-content: center;
    flex-wrap: nowrap;
  }

  .experiments-scroll-container {
    max-width: 100%;
    overflow-x: auto;
  }
  .experiments-table .step-label {
    width: auto;
    min-width: fit-content;
    white-space: nowrap;
    padding: .5rem .75rem;
  }


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

  .toast {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  z-index: 2000;
  animation: fadein 0.3s ease;
  }
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
</style>