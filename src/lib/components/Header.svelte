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

<section id="hero" style="min-height: 40px; margin-bottom: 16px; margin-top: 32px; border-bottom: 1px solid white;">
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 16px;">
    <div style="display: flex; align-items: center; gap: 20px;">
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
    
    {#if $isAuthenticated}
      <div class="auth-status">
        <span class="user-email">{$user?.email}</span>
        <button class="logout-button" on:click={handleLogout}>Logout</button>
      </div>
    {/if}
  </div>
</section>

<style>
  .auth-status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  
  .user-email {
    font-size: 0.9rem;
    color: var(--text);
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
  
  .logout-button:hover {
    background-color: #c83232;
  }
  
  @media (max-width: 768px) {
    .auth-status {
      flex-direction: row;
      align-items: center;
      gap: 12px;
    }
  }
</style>
