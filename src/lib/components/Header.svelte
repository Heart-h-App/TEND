<script lang="ts">
  import { page } from '$app/stores';
  import { auth, isAuthenticated, user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  // Get current email from URL params to preserve it in logo navigation
  $: currentEmail = $page.url.searchParams.get('email') || $user?.email;
  $: logoHref = currentEmail ? `/?email=${encodeURIComponent(currentEmail)}` : '/';
  
  async function handleLogout() {
    await auth.logout();
    window.location.replace('/');
    return;
  }
</script>

<section id="hero" class="hero">
  <div class="hero-row">
    <div class="hero-left">
      <a href={logoHref} class="logo">
        <img src="/hearth-logo.png" alt="Heart(h) Logo">
      </a>

      <div class="hero-copy">
        <h1>Welcome to Heart(h)!</h1>
        <p>
          Heart(h) software helps you connect with yourself and others, finding more joy and
          satisfaction with less grind and overwhelm
        </p>
      </div>
    </div>

    {#if $isAuthenticated}
      <div class="auth-status">
        <span class="user-email">{$user?.email}</span>
        <button class="logout-button" on:click={handleLogout}>Logout</button>
      </div>
    {/if}
  </div>
</section>

<style>
  /* --- layout --- */
  .hero {
    min-height: 40px;
    margin: 32px 0 16px 0;
    border-bottom: 1px solid white;
  }

  .hero-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 16px;

    /* KEY: allow the row to wrap instead of overflowing */
    flex-wrap: wrap;
  }

  .hero-left {
    display: flex;
    align-items: center;
    gap: 20px;

    /* KEY: allow this side to shrink when space is tight */
    min-width: 0;
    flex: 1 1 320px;
  }

  .logo {
    display: block;
    flex-shrink: 0; /* logo doesn’t collapse */
  }
  .logo img {
    width: 80px;
    height: auto;
    cursor: pointer;
  }

  .hero-copy {
    min-width: 0; /* KEY: let text shrink/ellipsis instead of forcing overflow */
  }
  .hero-copy h1 {
    margin: 0 0 8px 0;
    color: var(--heading);
  }
  .hero-copy p {
    margin: 0;
    font-style: italic;
    color: var(--text);
  }

  /* --- auth block --- */
  .auth-status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;

    /* KEY: allow this block to shrink within the row */
    min-width: 0;
    flex: 0 1 360px;
  }

  .user-email {
    font-size: 0.9rem;
    color: var(--text);

    /* KEY: never let a long email create horizontal overflow */
    max-width: clamp(160px, 45vw, 420px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .logout-button {
    padding: 6px 12px;
    background: var(--button-bg);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }
  .logout-button:hover { background-color: #c83232; }

  /* stack behaviors under ~796px */
  @media (max-width: 796px) {
    .auth-status {
      flex-direction: row;
      align-items: center;
      gap: 12px;

      /* keep it visually right-aligned when it wraps to the next line */
      margin-left: auto;
    }
  }
</style>
