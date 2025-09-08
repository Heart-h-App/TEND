<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
    
  type Experiment = {
      challenge: string;
      hypothesis: string;
      intervention: string;
      measure: string;
      learnings: string | null;
      createdAt: string;
      updatedAt: string;
    };
  
    let text = '';
    let loading = false;
    let error: string | null = null;
    let result: Experiment | null = null;
    let ownerEmail = '';
    let textLimitReached = false;

    // Get email from URL parameters
    onMount(() => {
      const emailParam = $page.url.searchParams.get('email');
      if (emailParam) {
        ownerEmail = emailParam;
      }
    });
  
  
  
    // Check if text limit is reached
    $: textLimitReached = text.length >= 2000;
  
    async function designExperiment() {
      error = null;
      result = null;
      
      if (!text.trim()) {
        error = 'Please enter a description.';
        return;
      }
      loading = true;
      try {
        const res = await fetch('/designExperiment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, ownerEmail })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Request failed');
        result = data as Experiment;
        
        // Save experiment to database
        if (ownerEmail) {
          try {
            const res2 = await fetch('/api/experiments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ownerEmail, ...result })
            });
            const saved = await res2.json();
            if (!res2.ok) {
              console.error('Save failed:', saved?.error);
            } else {
              console.log('Saved experiment id:', saved.id);
            }
          } catch (saveError) {
            console.error('Failed to save experiment:', saveError);
            // Don't fail the whole operation if saving fails
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
        
        <h3>Design an Experiment</h3>
        
        <!-- Email field hidden - populated from URL parameter -->
        <input 
          type="hidden"
          bind:value={ownerEmail}
        />
        
        {#if !result}
          <div class="input-group">
            {#if text}
              <label for="challenge-text" class="floating-label">When you think about your relationship goals, what's an important challenge you're facing? How are things going now? What opportunities and wins would success bring? What's currently most preventing success?</label>
            {/if}
            <textarea
              id="challenge-text"
              bind:value={text}
              placeholder={text ? "" : "When you think about your relationship goals, what's an important challenge you're facing? How are things going now? What opportunities and wins would success bring? What's currently most preventing success?"}
              rows="4"
              maxlength="2000"
            ></textarea>
            
            {#if textLimitReached}
              <p class="error">Max 2000 characters</p>
            {/if}
          </div>
  
          <button on:click={designExperiment} disabled={loading}>
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
          <h2>Your Experiment</h2>
          
          <div style="margin-bottom: 1rem;">
            <h3 style="margin-bottom: 0.5rem; color: var(--heading);">Challenge</h3>
            <p style="margin-bottom: 1rem;">{result.challenge}</p>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <h3 style="margin-bottom: 0.5rem; color: var(--heading);">Hypothesis</h3>
            <p style="margin-bottom: 1rem;">{result.hypothesis}</p>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <h3 style="margin-bottom: 0.5rem; color: var(--heading);">Intervention</h3>
            <p style="margin-bottom: 1rem;">{result.intervention}</p>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <h3 style="margin-bottom: 0.5rem; color: var(--heading);">Measure</h3>
            <p style="margin-bottom: 1rem;">{result.measure}</p>
          </div>
          
          {#if result.learnings}
            <div style="margin-bottom: 1rem;">
              <h3 style="margin-bottom: 0.5rem; color: var(--heading);">Learnings</h3>
              <p style="margin-bottom: 1rem;">{result.learnings}</p>
            </div>
          {/if}
          
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
  