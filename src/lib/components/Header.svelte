<script lang="ts">
  import { page } from '$app/stores';
  
  // Get current email from URL params to preserve it in logo navigation
  $: currentEmail = $page.url.searchParams.get('email');
  $: logoHref = currentEmail ? `/?email=${encodeURIComponent(currentEmail)}` : '/';
</script>

<section id="hero" style="min-height: 40px; margin-bottom: 16px; margin-top: 32px; border-bottom: 1px solid white;">
  <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 16px;">
    <a href={logoHref} style="display: block; flex-shrink: 0;">
      <img src="/hearth-logo.png" alt="Heart(h) Logo" style="width: 80px; height: auto; cursor: pointer;">
    </a>
    <div>
      <h1 style="margin: 0 0 8px 0; color: var(--heading);">Welcome to Heart(h)!</h1>
      <p style="margin: 0; font-style: italic; color: var(--text);">
        Heart(h) software helps you connect with yourself and others, finding more joy and satisfaction with less grind and overwhelm
      </p>
    </div>
  </div>
</section>
