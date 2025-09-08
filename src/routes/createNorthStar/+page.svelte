<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Diagram from "$lib/components/diagramNorthStar.svelte";

  type Item = { emoji: string; phrase: string };
  type NorthStar = {
    haiku: string;
    north: Item[];
    east: Item[];
    south: Item[];
    west: Item[];
  };

  let ownerEmail = '';
  let visionText = ''; 
  let currentText = '';
  let loading = false;
  let error: string | null = null;
  let result: NorthStar | null = null;
  let checkingExistingNorthStar = false;
  let visionLimitReached = false;
  let currentLimitReached = false;

  // Get email from URL parameters
  onMount(() => {
    const emailParam = $page.url.searchParams.get('email');
    if (emailParam) {
      ownerEmail = emailParam;
      checkForExistingNorthStar();
    }
  });

  async function checkForExistingNorthStar() {
    if (!ownerEmail.trim()) {
      result = null;
      return;
    }
    
    checkingExistingNorthStar = true;
    try {
      const res = await fetch(`/api/northStar?ownerEmail=${encodeURIComponent(ownerEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          result = data[0];
        } else {
          result = null;
        }
      } else {
        result = null;
      }
    } catch (e) {
      console.error('Failed to check existing north star:', e);
      result = null;
    } finally {
      checkingExistingNorthStar = false;
    }
  }

  // Reactive statement to check for existing north star when email changes
  $: if (ownerEmail) {
    checkForExistingNorthStar();
  } else {
    result = null;
  }

  // Check if text limits are reached
  $: visionLimitReached = visionText.length >= 1500;
  $: currentLimitReached = currentText.length >= 1500;

  async function generateNorthStar() {
    error = null;
    result = null;
    
    if (!visionText.trim() || !currentText.trim()) {
      error = 'Please fill in both fields.';
      return;
    }
    loading = true;
    try {
      const res = await fetch('/createNorthStar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visionText, currentText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      result = data as NorthStar;
      if (ownerEmail) {
        const res2 = await fetch('/api/northStar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerEmail, ...result })
        });
        const saved = await res2.json();
        if (!res2.ok) {
          console.error('Save failed:', saved?.error);
        } else {
          console.log('Saved North Star id:', saved.id);
          // Navigate back to dashboard with email parameter and modal state
          goto(`/?email=${encodeURIComponent(ownerEmail)}&openModal=true&selectNode=northstar`);
        }
    }
    } catch (e: any) {
      error = String(e?.message || e || 'Unknown error');
    } finally {
      loading = false;
    }
  }  
</script>


<main class="container">
  <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
    
    <div>
      <h2>TEND
        <br>
        <span style="font-size: 0.8em; font-style: italic; color: var(--text);">helps you nurture connection!</span>
      </h2>
      
      <h3>Set your North Star</h3>
      
      <!-- Email field hidden - populated from URL parameter -->
      <input 
        type="hidden"
        bind:value={ownerEmail}
      />
      
      {#if !result}
        <div class="input-group">
          {#if visionText}
            <label for="vision-text" class="floating-label">When you envision a satisfying connection life - what does that look like? What's the vibe/feel in that life? What does it create and nurture that most matters to you?</label>
          {/if}
          <textarea
            id="vision-text"
            bind:value={visionText}
            placeholder={visionText ? "" : "When you envision a satisfying connection life - what does that look like? What's the vibe/feel in that life? What does it create and nurture that most matters to you?"}
            rows="3"
            maxlength="1500"
          ></textarea>
          
          {#if visionLimitReached}
            <p class="error">Max 1500 characters</p>
          {/if}
        </div>

        <div class="input-group">
          {#if currentText}
            <label for="current-text" class="floating-label">Thinking about right now, what strengths most help you nurture your ideal life? What struggles or issues tend to get in the way? What gaps or missing pieces interfere with satisfaction?</label>
          {/if}
          <textarea
            id="current-text"
            bind:value={currentText}
            placeholder={currentText ? "" : "Thinking about right now, what strengths most help you nurture your ideal life? What struggles or issues tend to get in the way? What gaps or missing pieces interfere with satisfaction?"}
            rows="3"
            maxlength="1500"
          ></textarea>
          
          {#if currentLimitReached}
            <p class="error">Max 1500 characters</p>
          {/if}
        </div>

        <button on:click={generateNorthStar} disabled={loading}>
          {loading ? 'Thinking…' : 'LFG'}
        </button>
      {/if}

      {#if error}
        <p class="error">{error}</p>
      {/if}

      <p style="font-style: italic;">
        TEND helps you nurture connection by visualizing your important connections, setting direction for your relationships with a north star, and helping you design & run experiments to learn and grow
      </p>
    </div>

    {#if result}
      <div class="card">
        <h2>Your North Star</h2>
        <Diagram star={result} />
      </div>
    {/if}
  </div>
</main>

<style>
  .input-group {
    margin-bottom: 1rem;
  }

  .floating-label {
    display: block;
    font-size: 0.9rem;
    color: white;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  textarea {
    width: 100%;
    transition: border-color 0.2s ease;
  }
</style>
