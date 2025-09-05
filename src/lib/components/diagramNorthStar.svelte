<script lang="ts">
  type Item = { emoji: string; phrase: string };
  type NorthStar = {
    haiku: string;
    north: Item[];
    east: Item[];
    south: Item[];
    west: Item[];
  };

  export let star: NorthStar;
</script>

<div class="compass-container">
  <div class="compass">
    <!-- North -->
    <div class="direction north">
      <div class="direction-label">Growth</div>
      {#each star.north as item}
        <div class="compass-item">
          <span class="item-text">{item.emoji} {item.phrase}</span>
        </div>
      {/each}
    </div>

    <!-- West -->
    <div class="direction west">
      <div class="direction-label">Avoid</div>
      {#each star.west as item}
        <div class="compass-item">
          <span class="item-text">{item.emoji} {item.phrase}</span>
        </div>
      {/each}
    </div>

    <!-- Center - Haiku -->
    <div class="center">
      <div class="haiku">
        {#each star.haiku.split('\n') as line}
          <div class="haiku-line">{line}</div>
        {/each}
      </div>
    </div>

    <!-- East -->
    <div class="direction east">
      <div class="direction-label">Vibe</div>
      {#each star.east as item}
        <div class="compass-item">
          <span class="item-text">{item.emoji} {item.phrase}</span>
        </div>
      {/each}
    </div>

    <!-- South -->
    <div class="direction south">
      <div class="direction-label">Values</div>
      {#each star.south as item}
        <div class="compass-item">
          <span class="item-text">{item.emoji} {item.phrase}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .compass-container {
    width: 100%;
    padding: 0.5rem;
    box-sizing: border-box;
    overflow: hidden;
  }

  .compass {
    display: grid;
    grid-template-areas: 
      ". north ."
      "west center east"
      ". south .";
    grid-template-columns: 140px 160px 140px;
    grid-template-rows: 160px 160px 160px;
    width: 440px;
    height: 480px;
    gap: 0.25rem;
    margin: 0 auto;
  }

  .center {
    grid-area: center;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--input-bg);
    border: 1.5px solid var(--input-border);
    border-radius: 50%;
    padding: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    width: 160px;
    height: 160px;
    box-sizing: border-box;
  }

  .haiku {
    text-align: center;
    font-family: 'Mulish', sans-serif;
    font-style: italic;
    font-size: 0.75rem;
    line-height: 1.2;
    color: var(--text);
    max-width: 100%;
  }

  .haiku-line {
    margin-bottom: 0.2rem;
  }

  .direction {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.4rem;
    background: var(--input-bg);
    border-radius: 12px;
    border: 1.5px solid var(--input-border);
    overflow: hidden;
    min-height: 0;
    max-height: 100%;
    box-sizing: border-box;
  }

  .north { grid-area: north; }
  .east { grid-area: east; }
  .south { grid-area: south; }
  .west { grid-area: west; }

  .direction-label {
    font-family: 'Mulish', sans-serif;
    font-weight: 600;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text);
    margin-bottom: 0.2rem;
    flex-shrink: 0;
  }

  .compass-item {
    margin-bottom: 0.2rem;
    text-align: center;
    max-width: 100%;
    box-sizing: border-box;
  }

  .item-text {
    font-family: 'Mulish', sans-serif;
    font-size: 0.7rem;
    color: var(--text);
    line-height: 1.2;
    word-wrap: break-word;
    hyphens: auto;
    display: block;
    max-width: 110px;
    text-align: center;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .compass {
      width: 320px;
      height: 320px;
    }
    
    .center {
      padding: 1rem;
    }
    
    .haiku {
      font-size: 0.8rem;
    }
  }
</style>