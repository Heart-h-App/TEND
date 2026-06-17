<script lang="ts">
  import StarRating from '$lib/components/StarRating.svelte';

  type Experiment = {
    id: string;
    challenge: string;
    hypothesis: string;
    intervention: string;
    measure: string;
    rating: number | null;
    createdAt: string;
    learnings?: string | null;
  };

  type ExperimentField = 'challenge' | 'hypothesis' | 'intervention' | 'measure';

  const fieldConfig: Array<{ key: ExperimentField; label: string; rows: number }> = [
    { key: 'challenge', label: 'Challenge', rows: 3 },
    { key: 'hypothesis', label: 'Hypothesis', rows: 3 },
    { key: 'intervention', label: 'Intervention', rows: 4 },
    { key: 'measure', label: 'Measure', rows: 3 }
  ];

  export let experiments: Experiment[] = [];
  export let email: string;
  export let editingExperimentField: string | null = null;
  export let editExperimentValue = '';
  export let savingExperimentField: string | null = null;
  export let savedExperimentField: string | null = null;
  export let startEditExperimentField: (experimentId: string, field: ExperimentField, currentValue: string) => void;
  export let handleExperimentFieldBlur: (experimentId: string, field: ExperimentField, value: string) => void;
  export let handleExperimentFieldKeydown: (event: KeyboardEvent, experimentId: string, field: ExperimentField, value: string) => void;
  export let handleDeleteExperiment: (experiment: Experiment) => void;
  export let setEditExperimentValue: (value: string) => void;

  let currentSlide = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let trackingSwipe = false;

  const SWIPE_THRESHOLD = 40;
  const VERTICAL_SLOP = 30;

  $: if (experiments.length === 0) {
    currentSlide = 0;
  } else if (currentSlide > experiments.length - 1) {
    currentSlide = experiments.length - 1;
  }

  function nextSlide() {
    if (experiments.length <= 1) return;
    currentSlide = (currentSlide + 1) % experiments.length;
  }

  function prevSlide() {
    if (experiments.length <= 1) return;
    currentSlide = (currentSlide - 1 + experiments.length) % experiments.length;
  }

  function goToSlide(index: number) {
    currentSlide = index;
  }

  function fieldKey(experimentId: string, field: ExperimentField) {
    return `${experimentId}-${field}`;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function handleCarouselKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prevSlide();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nextSlide();
    }
  }

  function targetIsInteractive(target: EventTarget | null) {
    return target instanceof Element
      && Boolean(target.closest('button, textarea, input, select, a, [role="button"]'));
  }

  function handleTouchStart(event: TouchEvent) {
    if (experiments.length <= 1 || targetIsInteractive(event.target)) {
      trackingSwipe = false;
      return;
    }

    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    trackingSwipe = true;
  }

  function handleTouchEnd(event: TouchEvent) {
    if (!trackingSwipe || targetIsInteractive(event.target)) {
      trackingSwipe = false;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    trackingSwipe = false;

    if (Math.abs(deltaY) > VERTICAL_SLOP || Math.abs(deltaX) < SWIPE_THRESHOLD) {
      return;
    }

    if (deltaX < 0) {
      nextSlide();
    } else {
      prevSlide();
    }
  }
</script>

<div
  class="experiments-carousel"
  role="region"
  aria-label="Experiments carousel"
>
  <div
    class="experiments-carousel-viewport"
    on:touchstart={handleTouchStart}
    on:touchend={handleTouchEnd}
  >
    <div
      class="experiments-carousel-track"
      style="transform: translateX(-{currentSlide * 100}%);"
    >
      {#each experiments as experiment, index}
        <article
          class="experiment-card"
          class:completed={Boolean(experiment.learnings)}
          aria-hidden={index !== currentSlide}
        >
          <header class="experiment-card-header">
            <div class="experiment-card-title-row">
              <div class="experiment-card-date">{formatDate(experiment.createdAt)}</div>
            </div>
            {#if experiment.learnings}
              <span class="experiment-card-badge">Completed</span>
            {/if}
          </header>

          <div class="experiment-card-body">
            {#each fieldConfig as field}
              <section class="experiment-section">
                {#if editingExperimentField === fieldKey(experiment.id, field.key)}
                  <div class="experiment-inline-row editing-inline-row">
                    <div class="experiment-inline-prefix">
                      <span class="experiment-section-label">{field.label}</span>
                      <span class="experiment-inline-separator">-</span>
                    </div>
                    <textarea
                      class="experiment-textarea"
                      value={editExperimentValue}
                      on:input={(event) => setEditExperimentValue((event.currentTarget as HTMLTextAreaElement).value)}
                      on:blur={() => handleExperimentFieldBlur(experiment.id, field.key, editExperimentValue)}
                      on:keydown={(event) => handleExperimentFieldKeydown(event, experiment.id, field.key, editExperimentValue)}
                      rows={field.rows}
                      aria-label={`Edit ${field.label.toLowerCase()}`}
                    ></textarea>
                    {#if savingExperimentField === fieldKey(experiment.id, field.key)}
                      <span class="status-indicator">⏳</span>
                    {:else if savedExperimentField === fieldKey(experiment.id, field.key)}
                      <span class="status-indicator saved">✓</span>
                    {/if}
                  </div>
                {:else}
                  <button
                    type="button"
                    class="experiment-inline-row editable-experiment-card"
                    class:saved={savedExperimentField === fieldKey(experiment.id, field.key)}
                    on:click={() => startEditExperimentField(experiment.id, field.key, experiment[field.key] || '')}
                    aria-label={`Edit ${field.label.toLowerCase()}`}
                    title={experiment[field.key] || ''}
                  >
                    <div class="experiment-inline-prefix">
                      <span class="experiment-section-label">{field.label}</span>
                      <span class="experiment-inline-separator">-</span>
                    </div>
                    <span class="experiment-inline-content">{experiment[field.key] || 'Add details'}</span>
                    <span class="experiment-edit-icon">✏️</span>
                    {#if savedExperimentField === fieldKey(experiment.id, field.key)}
                      <span class="status-indicator saved">✓</span>
                    {/if}
                  </button>
                {/if}
              </section>
            {/each}

            <section class="experiment-section meta-section">
              <div class="experiment-inline-row rating-row">
                <div class="experiment-inline-prefix">
                  <span class="experiment-section-label">Rating</span>
                  <span class="experiment-inline-separator">-</span>
                </div>
                <StarRating
                  rating={experiment.rating}
                  experimentId={experiment.id}
                  ownerEmail={email}
                  size="small"
                  readonly={false}
                />
              </div>
            </section>
          </div>

          <div class="experiment-card-footer">
            <button
              type="button"
              class="experiment-delete-button"
              on:click={() => handleDeleteExperiment(experiment)}
              aria-label="Delete experiment"
            >
              Delete
            </button>
          </div>
        </article>
      {/each}
    </div>
  </div>

  {#if experiments.length > 1}
    <div class="experiments-carousel-controls">
      <button
        type="button"
        class="experiments-carousel-nav"
        on:click={prevSlide}
        on:keydown={handleCarouselKeydown}
        aria-label="Previous experiment"
      >
        ‹
      </button>

      <div class="experiments-carousel-status">
        <span class="experiments-carousel-count">{currentSlide + 1} / {experiments.length}</span>
        <div class="experiments-carousel-dots">
          {#each experiments as _, index}
            <button
              type="button"
              class="experiments-carousel-dot"
              class:active={index === currentSlide}
              on:click={() => goToSlide(index)}
              on:keydown={handleCarouselKeydown}
              aria-label={`Go to experiment ${index + 1}`}
              aria-current={index === currentSlide ? 'true' : 'false'}
            ></button>
          {/each}
        </div>
      </div>

      <button
        type="button"
        class="experiments-carousel-nav"
        on:click={nextSlide}
        on:keydown={handleCarouselKeydown}
        aria-label="Next experiment"
      >
        ›
      </button>
    </div>
  {/if}
</div>

<style>
  .experiments-carousel {
    width: 100%;
    outline: none;
  }

  .experiments-carousel:focus-visible {
    box-shadow: 0 0 0 2px rgba(34, 58, 94, 0.35);
    border-radius: 10px;
  }

  .experiments-carousel-viewport {
    overflow: hidden;
    width: 100%;
    touch-action: pan-y;
  }

  .experiments-carousel-track {
    display: flex;
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform;
  }

  .experiment-card {
    flex: 0 0 100%;
    width: 100%;
    border: 1px solid var(--input-border);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    padding: 0.9rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    min-height: 100%;
  }

  .experiment-card.completed {
    border-color: rgba(34, 197, 94, 0.35);
    background: rgba(34, 197, 94, 0.05);
  }

  .experiment-card-header,
  .experiment-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .experiment-card-date {
    font-size: 0.95rem;
    color: #fff;
    font-weight: 700;
    font-style: italic;
  }

  .experiment-card-title-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  .experiment-card-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    background: rgba(34, 197, 94, 0.14);
    color: #22c55e;
    white-space: nowrap;
  }

  .experiment-card-body {
    display: grid;
    gap: 0.75rem;
  }

  .experiment-section {
    display: grid;
    gap: 0.35rem;
  }

  .experiment-section-label {
    font-size: 0.76rem;
    font-weight: 700;
    color: var(--heading);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex: 0 0 auto;
  }

  .experiment-inline-row {
    width: 100%;
    padding: 0;
    text-align: left;
    color: var(--text);
    font-size: 0.86rem;
    line-height: 1.45;
    display: block;
    background: transparent;
    border: none;
  }

  .experiment-inline-prefix {
    display: inline;
  }

  .experiment-inline-separator {
    color: var(--heading);
    font-weight: 700;
    display: inline;
    margin: 0 0.35rem 0 0.2rem;
  }

  .experiment-inline-content {
    color: var(--text);
    display: inline;
    overflow-wrap: anywhere;
  }

  .editable-experiment-card {
    position: relative;
    cursor: pointer;
    transition: background-color 0.2s ease;
    padding: 0.15rem 0;
  }

  .editable-experiment-card:hover,
  .editable-experiment-card:focus-visible {
    background: rgba(34, 58, 94, 0.08);
    outline: none;
  }

  .editable-experiment-card.saved {
    background: rgba(34, 197, 94, 0.08);
  }

  .experiment-edit-icon {
    opacity: 0;
    font-size: 0.78rem;
    flex: 0 0 auto;
    transition: opacity 0.2s ease;
  }

  .editable-experiment-card:hover .experiment-edit-icon,
  .editable-experiment-card:focus-visible .experiment-edit-icon {
    opacity: 0.65;
  }

  .experiment-editing-shell {
    padding: 0.15rem 0;
  }

  .experiment-textarea {
    display: inline-block;
    width: 100%;
    min-height: 72px;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text);
    font: inherit;
    line-height: 1.45;
    resize: vertical;
    box-sizing: border-box;
  }

  .meta-section {
    margin-top: 0.15rem;
  }

  .rating-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .rating-row .experiment-inline-prefix {
    display: inline-flex;
    align-items: baseline;
  }

  .rating-row :global(.star-rating) {
    width: auto;
    max-width: none;
  }

  .experiment-delete-button {
    width: 100%;
    padding: 0.7rem 0.85rem;
    border: none;
    border-radius: 6px;
    background: var(--brand-primary);
    color: #fff;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .experiment-delete-button:hover,
  .experiment-delete-button:focus-visible {
    opacity: 0.9;
    outline: none;
  }

  .experiments-carousel-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    margin-top: 0.8rem;
  }

  .experiments-carousel-nav {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.04);
    color: var(--heading);
    font-size: 1.35rem;
    line-height: 1;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.2s ease;
  }

  .experiments-carousel-nav:hover,
  .experiments-carousel-nav:focus-visible {
    background: rgba(34, 58, 94, 0.16);
    transform: scale(1.04);
    outline: none;
  }

  .experiments-carousel-status {
    flex: 1;
    display: grid;
    justify-items: center;
    gap: 0.35rem;
  }

  .experiments-carousel-count {
    font-size: 0.78rem;
    color: var(--text);
    opacity: 0.85;
  }

  .experiments-carousel-dots {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .experiments-carousel-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    border: none;
    background: rgba(255, 255, 255, 0.25);
    cursor: pointer;
    padding: 0;
    transition: transform 0.2s ease, background-color 0.2s ease;
  }

  .experiments-carousel-dot.active,
  .experiments-carousel-dot:hover,
  .experiments-carousel-dot:focus-visible {
    background: var(--brand-primary);
    transform: scale(1.2);
    outline: none;
  }

  .status-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 0.3rem;
    font-size: 0.85rem;
    flex: 0 0 auto;
  }

  .status-indicator.saved {
    color: #22c55e;
  }
</style>
