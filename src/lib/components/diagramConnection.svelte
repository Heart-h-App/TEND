<script context="module" lang="ts">
  export type Node = {
    id: string;
    label: string;
    desc?: string;
    name?: string;
    description?: string;
    status?: "on track" | "strained";
    details?: Record<string, string>;
    x: number;
    y: number;
    width?: number;
    height?: number;
  };

  export type Edge = {
    id: string;
    source: string;
    target: string;
    status: "on track" | "strained";
  };
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let nodes: Node[] = [];
  export let edges: Edge[] = [];

  const findNode = (id: string) => nodes.find((n) => n.id === id);

  const dash = (status: Edge["status"]) =>
    status === "on track" ? "" : "3,6";

  const dispatch = createEventDispatcher();
</script>

<svg class="diagram" viewBox="0 0 800 300" role="img" aria-label="Relationship diagram">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--input-border)" />
    </marker>
  </defs>

  <!-- edges first (so they sit under nodes) -->
  {#each edges as e}
    {#if findNode(e.source) && findNode(e.target)}
      {@const s = findNode(e.source)!}
      {@const t = findNode(e.target)!}
      <line
        x1={s.x + (s.width ?? 180)}
        y1={s.y + (s.height ?? 120) / 2}
        x2={t.x}
        y2={t.y + (t.height ?? 120) / 2}
        stroke="var(--input-border)"
        stroke-width="2"
        stroke-dasharray={dash(e.status)}
        marker-end="url(#arrow)"
      />
    {/if}
  {/each}

  <!-- nodes -->
  {#each nodes as n}
    <g
      class="node-group"
      role="button"
      tabindex="0"
      aria-label={`Open details for ${n.label}`}
      on:click={() => dispatch('nodeSelect', n)}
      on:keydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dispatch('nodeSelect', n);
        }
      }}
    >
      <rect
        x={n.x}
        y={n.y}
        rx="12"
        width={n.width ?? 180}
        height={n.height ?? 120}
        class="node"
      />
      <text x={n.x + ((n.width ?? 180) / 2)} y={n.y + ((n.height ?? 120) / 2) - 20} text-anchor="middle" class="title">
        {n.label}
      </text>
      {#if n.desc}
        <text x={n.x + ((n.width ?? 180) / 2)} y={n.y + ((n.height ?? 120) / 2) + 25} text-anchor="middle" class="emoji">
          {n.desc}
        </text>
      {/if}
    </g>
  {/each}

</svg>

<style>
  .diagram { width: 100%; height: auto; display: block; }
  .node    { 
    fill: var(--input-bg); 
    stroke: var(--input-border); 
    stroke-width: 1.5; 
    pointer-events: all; 
  }
  .title   { 
    font-family: 'Mulish', sans-serif;
    font-weight: 600; 
    font-size: 0.9rem; 
    dominant-baseline: middle; 
    pointer-events: none;
    fill: var(--text);
  }
  .emoji {
    font-size: 0.9rem;
    dominant-baseline: middle;
    pointer-events: none;
    fill: var(--text);
  }
  .node-group { 
    cursor: pointer; 
    pointer-events: all;
  }
  .node-group:hover .node { 
    stroke: white;
    stroke-width: 3;
  }
  .node-group:focus { 
    outline: 2px solid var(--brand-accent); 
    outline-offset: 2px; 
  }
</style>