<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Diagram from "$lib/components/diagramConnection.svelte";
  import type { Node as DNode, Edge as DEdge } from "$lib/components/diagramConnection.svelte";

  type Rel = {
    name: string;
    description: string;
    status: 'on track' | 'strained';
    details: { '+': string; '∆': string; '→': string };
  };

  let text = '';
  let loading = false;
  let error: string | null = null;
  let result: Rel | null = null;
  let ownerEmail = '';
  let checkingExistingRelationship = false;
  let textLimitReached = false;

  // Get email from URL parameters
  onMount(() => {
    const emailParam = $page.url.searchParams.get('email');
    if (emailParam) {
      ownerEmail = emailParam;
      checkForExistingRelationship();
    }
  });

  async function checkForExistingRelationship() {
    if (!ownerEmail.trim()) {
      result = null;
      return;
    }
    
    checkingExistingRelationship = true;
    try {
      const res = await fetch(`/api/relationships?ownerEmail=${encodeURIComponent(ownerEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          // Display the most recent relationship
          result = data[0];
        } else {
          result = null;
        }
      } else {
        result = null;
      }
    } catch (e) {
      console.error('Failed to check existing relationships:', e);
      result = null;
    } finally {
      checkingExistingRelationship = false;
    }
  }

  // Reactive statement to check for existing relationships when email changes
  $: if (ownerEmail) {
    checkForExistingRelationship();
  } else {
    result = null;
  }

  // Check if text limit is reached
  $: textLimitReached = text.length >= 2000;

  async function mapConnection() {
    error = null;
    result = null;
    
    if (!text.trim()) {
      error = 'Please enter a description.';
      return;
    }
    loading = true;
    try {
      const res = await fetch('/mapConnection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      result = data as Rel;
      if (ownerEmail) {
        const res2 = await fetch('/api/relationships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerEmail, ...result })
        });
        const saved = await res2.json();
        if (!res2.ok) {
          console.error('Save failed:', saved?.error);
        } else {
          console.log('Saved relationship id:', saved.id);
          // Navigate back to dashboard with email parameter and modal state
          goto(`/?email=${encodeURIComponent(ownerEmail)}&openModal=true&selectNode=connection`);
        }
    }
    } catch (e: any) {
      error = String(e?.message || e || 'Unknown error');
    } finally {
      loading = false;
    }
  }

  // Convert model JSON -> nodes/edges for Diagram
  function toGraph(r: any): { nodes: DNode[]; edges: DEdge[] } {
    if (!r) return { nodes: [], edges: [] };

    const status = r.status ?? "on track";
    const name = r.name ?? "Unknown";
    const description = r.description ?? "";
    const details: Record<string, string> | undefined = r.details;

    const you: DNode = {
      id: 'you',
      label: 'You',
      name: 'You',
      description: '',
      status: undefined,
      details: {},
      x: 60,
      y: 100
    };

    const partner: DNode = {
      id: 'p1',
      label: name,
      desc: description,
      name,
      description,
      status,
      details,
      x: 500,
      y: 100
    };

    const edge: DEdge = { id: "e1", source: "you", target: "p1", status };

    return { nodes: [you, partner], edges: [edge] };
  }

  let selected: DNode | null = null;
  function handleNodeSelect(e: CustomEvent<DNode>) {
    selected = e.detail; // expect { name, description, details, ... }
  }
</script>

<section id="hero" style="min-height: 40px; margin-bottom: 16px; border-bottom: 1px solid var(--input-border);">
  <h1>Welcome to Heart(h)!</h1>
  <p style="font-style: italic;">
    Heart(h)'s tools help you connect with yourself and others, finding more joy and satisfaction with less grind and overwhelm
  </p>
</section>

<main class="container">
  <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
    
    <div>
      <h2>TEND
        <br>
        <span style="font-size: 0.8em; font-style: italic; color: var(--text);">helps you nurture connection!</span>
      </h2>
      
      <h3>Map Your Relationship</h3>
      
      <!-- Email field hidden - populated from URL parameter -->
      <input 
        type="hidden"
        bind:value={ownerEmail}
      />
      
      {#if !result}
        <div class="input-group">
          {#if text}
            <label for="relationship-text" class="floating-label">Describe an important person and your relationship with them. Include their name, what's going well, what's challenging, and what you hope for.</label>
          {/if}
          <textarea
            id="relationship-text"
            bind:value={text}
            placeholder={text ? "" : "Describe an important person and your relationship with them. Include their name, what's going well, what's challenging, and what you hope for."}
            rows="4"
            maxlength="2000"
          ></textarea>
          
          {#if textLimitReached}
            <p class="error">Max 2000 characters</p>
          {/if}
        </div>

        <button on:click={mapConnection} disabled={loading}>
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
      <div class="card" class:no-hover={selected}>
        <h2>Your Map</h2>
        <Diagram {...toGraph(result)} on:nodeSelect={handleNodeSelect} />
      </div>
      
      {#if selected}
        <!-- Backdrop -->
        <button
          class="backdrop"
          aria-label="Close details"
          on:click={() => (selected = null)}
        ></button>

        <!-- Side panel -->
        <aside
          style="position: fixed; right: 0; top: 0; height: 100vh; width: 360px; max-width: 85vw; z-index: 50; background-color: var(--bg); border-left: 1px solid var(--input-border); padding: 20px; overflow-y: auto; box-shadow: -4px 0 8px rgba(0, 0, 0, 0.2);"
          aria-label="Relationship details"
        >
          <button
            style="position: absolute; top: 12px; right: 12px; background: none; border: none; color: var(--text); font-size: 1.2em; cursor: pointer;"
            on:click={() => (selected = null)}
            aria-label="Close details"
          >
            ✕
          </button>

          <h3 style="margin-top: 0; color: var(--heading);">{selected.name}</h3>
          {#if selected.description}
            <div style="font-size: 2em; margin-bottom: 1rem; text-align: left;">{selected.description}</div>
          {/if}

          {#if selected.status}
            <div style="margin-bottom: 1rem; color: var(--text);">
              <span style="font-weight: 600;">Status:</span> {selected.status}
            </div>
          {/if}

          {#if selected.details}
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              {#each Object.entries(selected.details) as [label, text]}
                <div style="background-color: var(--input-bg); border: 1px solid var(--input-border); border-radius: 8px; padding: 1rem; margin: 0;">
                  <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--heading); font-size: 1.1em;">{label}</div>
                  <div style="color: var(--text); line-height: 1.4;">{text}</div>
                </div>
              {/each}
            </div>
          {/if}
        </aside>
      {/if}
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
