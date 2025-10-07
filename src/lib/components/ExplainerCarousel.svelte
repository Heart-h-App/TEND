<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  // Carousel slides with clear onboarding messaging
  const slides = [
    {
      emoji: "🚀",
      title: "How do I TEND?",
      description: "In minutes, our AI tools create experiments customized to your context and goals - less work, more traction, radical progress"
    },
    {
      emoji: "🧑🏼‍🔬",
      title: "What's an Experiment?",
      description: "Lean science for self-work! Share a challenge, TEND AI gives a neuroscience-based intervention; use these 1-3 minute practices when the challenge arises - get richer insights, amplified growth"
    },
    {
      emoji: "🗺️",
      title: "How's a Map Help?",
      description: "Share free-flowing thoughts about your relationships, TEND AI concisely organizes your current connection world; AI also customizes experiments to your map"
    },
    {
      emoji: "⭐",
      title: "A North Star ... For What?",
      description: "With this big-picture snapshot, TEND AI supercharges your raw ideas about where you want connection to go; your North Star keeps experiments aimed at your goals"
    },
    {
      emoji: "🧪",
      title: "Ready to Create Your Lab?",
      description: "Enter your email below to get started!"
    }
  ];

  let currentSlide = 0;
  let isPaused = false;
  let interval: ReturnType<typeof setInterval> | null = null;

  function nextSlide() {
    if (!isPaused) {
      currentSlide = (currentSlide + 1) % slides.length;
    }
  }

  function prevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    resetInterval();
  }

  function goToSlide(index: number) {
    currentSlide = index;
    resetInterval();
  }

  function resetInterval() {
    if (interval) clearInterval(interval);
    interval = setInterval(nextSlide, 9000);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      prevSlide();
    } else if (event.key === 'ArrowRight') {
      nextSlide();
      resetInterval();
    }
  }

  onMount(() => {
    interval = setInterval(nextSlide, 9000);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<div 
  class="carousel-container"
  role="region"
  aria-label="TEND feature carousel"
  aria-live="polite"
>
  <div class="carousel-content">
    <!-- Slides -->
    <div 
      class="carousel-track" 
      style="transform: translateX(-{currentSlide * 100}%)"
      on:mouseenter={() => isPaused = true}
      on:mouseleave={() => isPaused = false}
      on:focusin={() => isPaused = true}
      on:focusout={() => isPaused = false}
    >
      {#each slides as slide, i}
        <div 
          class="carousel-slide" 
          class:active={i === currentSlide}
          aria-hidden={i !== currentSlide}
        >
          <div class="slide-emoji">{slide.emoji}</div>
          <h3 class="slide-title">{slide.title}</h3>
          <p class="slide-description">{slide.description}</p>
        </div>
      {/each}
    </div>

    <!-- Navigation Controls -->
    <div class="carousel-controls">
      <button
        class="carousel-nav prev"
        on:click={prevSlide}
        on:keydown={handleKeydown}
        aria-label="Previous slide"
        type="button"
      >
        ‹
      </button>
      
      <div class="carousel-dots">
        {#each slides as _, i}
          <button
            class="carousel-dot"
            class:active={i === currentSlide}
            on:click={() => goToSlide(i)}
            aria-label="Go to slide {i + 1}"
            aria-current={i === currentSlide ? 'true' : 'false'}
            type="button"
          ></button>
        {/each}
      </div>

      <button
        class="carousel-nav next"
        on:click={() => { currentSlide = (currentSlide + 1) % slides.length; resetInterval(); }}
        on:keydown={handleKeydown}
        aria-label="Next slide"
        type="button"
      >
        ›
      </button>
    </div>
  </div>
</div>

<style>
  .carousel-container {
    position: relative;
    width: 100%;
    overflow: hidden;
  }

  .carousel-content {
    position: relative;
    width: 100%;
  }

  .carousel-track {
    display: flex;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform;
  }

  .carousel-slide {
    flex: 0 0 100%;
    text-align: center;
    opacity: 0.4;
    transxition: opacity 0.4s ease;
  }

  .carousel-slide.active {
    opacity: 1;
  }

  .slide-emoji {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
    line-height: 1;
  }

  .slide-title {
    color: var(--brand-primary);
    font-size: 1.25rem;
    font-weight: 900;
    line-height: 1.3;
  }

  .slide-description {
    margin: 0;
    color: var(--text);
    font-size: 1rem;
    line-height: 1.5;
    opacity: 0.85;
    max-width: 90%;
    margin-left: auto;
    margin-right: auto;
  }

  .carousel-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 0.5rem 0 1rem;
  }

  .carousel-nav {
    background: none;
    border: none;
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--brand-deep);
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    transition: all 0.2s ease;
    line-height: 1;
  }

  .carousel-nav:hover,
  .carousel-nav:focus-visible {
    opacity: 1;
    transform: scale(1.2);
  }

  .carousel-nav:focus-visible {
    outline: 2px solid var(--brand-deep);
    outline-offset: 2px;
    border-radius: 4px;
  }

  .carousel-dots {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .carousel-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    background: var(--brand-primary);
    padding: 0;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .carousel-dot:hover,
  .carousel-dot.active {
    background: var(--brand-deep);
    transform: scale(1.3);
  }

  .carousel-dot:focus-visible {
    outline: 2px solid var(--brand-deep);
    outline-offset: 2px;
  }
</style>
