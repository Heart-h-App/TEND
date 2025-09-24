<script lang="ts">
  // Props
  export let rating: number | null = null;
  export let experimentId: string | null = null;
  export let disabled: boolean = false;
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let readonly: boolean = false;
  export let ownerEmail: string | null = null;
  
  // Local state
  let hoveredRating: number | null = null;
  let isSubmitting = false;
  let error: string | null = null;
  let successMessage: string | null = null;
  
  // Computed values
  $: displayRating = hoveredRating !== null ? hoveredRating : rating;
  $: sizeClass = {
    small: 'star-rating-small',
    medium: 'star-rating-medium',
    large: 'star-rating-large'
  }[size];
  
  // Methods
  function handleMouseEnter(star: number) {
    if (readonly || disabled || isSubmitting) return;
    hoveredRating = star;
  }
  
  function handleMouseLeave() {
    if (readonly || disabled || isSubmitting) return;
    hoveredRating = null;
  }
  
  async function handleClick(star: number) {
    if (readonly || disabled || isSubmitting) {
      return;
    }
    
    if (!experimentId) {
      error = 'Missing experiment ID';
      return;
    }
    
    if (!ownerEmail) {
      error = 'Missing owner email';
      return;
    }
    
    // Don't do anything if clicking the same rating
    if (rating === star) {
      return;
    }
    
    isSubmitting = true;
    error = null;
    successMessage = null;
    
    // Update local rating immediately for better UX
    const previousRating = rating;
    rating = star;
    
    try {
      const response = await fetch(`/api/experiments/${experimentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating: star })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update rating');
      }
      
      const data = await response.json();
      rating = data.rating;
      successMessage = 'Rating updated';
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        successMessage = null;
      }, 3000);
      
    } catch (err: any) {
      // Revert to previous rating on error
      rating = previousRating;
      error = err.message || 'Failed to update rating';
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        error = null;
      }, 5000);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="star-rating {sizeClass}" class:disabled class:readonly>
  <div class="stars-container">
    {#each Array(5) as _, i}
      {@const starValue = i + 1}
      <button
        type="button"
        class="star"
        class:filled={displayRating !== null && starValue <= displayRating}
        class:unfilled={displayRating === null || starValue > displayRating}
        on:mouseenter={() => handleMouseEnter(starValue)}
        on:mouseleave={handleMouseLeave}
        on:click={() => handleClick(starValue)}
        disabled={disabled || readonly || isSubmitting}
        aria-label={`Rate ${starValue} star${starValue !== 1 ? 's' : ''}`}
      >
        <span class="star-icon">★</span>
      </button>
    {/each}
  </div>
  
  <div class="status-container">
    {#if isSubmitting}
      <span class="status-message loading">Saving...</span>
    {:else if error}
      <span class="status-message error">{error}</span>
    {:else if successMessage}
      <span class="status-message success">{successMessage}</span>
    {/if}
  </div>
</div>

<style>
  .star-rating {
    display: inline-flex;
    flex-wrap: nowrap;
    gap: 0.15rem;
  }
  
  .stars-container {
    display: inline-flex;
    flex-wrap: nowrap;
    gap: 0.15rem;
  }
  
  .star {
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    transition: transform 0.1s ease;
    line-height: 1;
    flex: 0 0 auto;
  }
  
  .star:hover:not(:disabled) {
    transform: scale(1.2);
  }
  
  .star-icon {
    display: inline-block;
    transition: color 0.2s ease;
  }
  
  .filled .star-icon {
    color: var(--color-warning, #FFD700); /* Use warning color for filled stars */
  }
  
  .unfilled .star-icon {
    color: var(--input-border);
    opacity: 0.7;
  }
  
  /* Size variants */
  .star-rating-small .star-icon {
    font-size: 1rem;
  }
  
  .star-rating-medium .star-icon {
    font-size: 1.5rem;
  }
  
  .star-rating-large .star-icon {
    font-size: 2rem;
  }
  
  /* States */
  .disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .readonly .star {
    cursor: default;
  }
  
  .readonly .star:hover {
    transform: none;
  }
  
  /* Status container */
  .status-container {
    display: inline-block;
    min-height: 1rem;
    margin-left: 0.25rem;
    vertical-align: middle;
  }
  
  /* Status messages */
  .status-message {
    font-size: 0.7rem;
    text-align: center;
    display: inline-block;
  }
  
  .loading {
    color: var(--text);
    opacity: 0.8;
  }
  
  .error {
    color: var(--color-error);
  }
  
  .success {
    color: var(--color-success);
  }
</style>
