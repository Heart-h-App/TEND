<script lang="ts">
  // Email CTA function
  function openEmailCTA() {
    const email = 'heart.h.connect.app@gmail.com';
    const subject = 'I want moar TEND!';
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    window.open(mailtoLink, '_self');
  }
</script>

<main class="container">
  <div class="paul-connect-page">
    <div class="hero-section">
      <p class="subtitle">
        Looking for more? Let's explore how we can play together.
      </p>
    </div>

    <div class="cta-section">
      <h2>Ways to Connect</h2>
      
      <div class="cta-cards">
        <div class="cta-card">
          <h3 style="margin-top: 0;">🎯 1:1 Coaching</h3>
          <p>
            Work with coach paul to strengthen mental & emotional fitness and use experiments to grow through challenges.
          </p>
          <a 
            href="https://forms.gle/V2GyDfSpK12iTcqm9" 
            target="_blank" 
            rel="noopener noreferrer"
            class="cta-button secondary"
          >
            Sign up for free 1:1 session
          </a>
        </div>

        <div class="cta-card">
          <h3 style="margin-top: 0;">💬 Slide in my DMs</h3>
          <p>
            Interested in workshops, partnerships, or have questions/feedback about Heart(h)? 
            Let's start a conversation about it!
          </p>
          <button 
            on:click={openEmailCTA}
            class="cta-button secondary"
          >
            Send Me an Email
          </button>
        </div>
      </div>
    </div>

    <div class="bio-section">
      <h2>About Heart(h)</h2>
      <div class="bio-content">
        <p>
          Hi, I'm paul hudson mack (<a href="https://www.linkedin.com/in/paul-hudson-mack-msw-3b43b310/">LinkedIn</a>).
          <br><br>
          I started Heart(h) because no one gets addicted to their toasters ... 
          and yet a lot of software keeps people doomscrolling and ruins internal well-being & relationships.
          We all deserve self-work and behavioral health tools more like my favorite toaster - does its job well and leaves my system nourished to engage the rest of life.
          <br><br>
          I take insights from leading edge behavioral science and build tools that empower users to create traction and results daily.
          TEND combines lean experimentation, design thinking, modern neuroscience, and positive psychology - and uses AI to streamline how users create artifacts to support their self- and relationship-work.
        </p>
        <p>
          I'd love to hear from you! What's working for you, what's not, and how can we keep making tools that serve you better? 
          I also offer 1:1 coaching if you'd like support in doing this kind of work.
          Use the links below so we can connect and play together!
        </p>
      </div>
    </div>

    

    <div class="back-section">
      <a href="/" class="back-link">← Back to TEND Dashboard</a>
    </div>
  </div>
</main>

<style>
  .paul-connect-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .hero-section {
    text-align: center;
    margin-bottom: 3rem;
  }

  .hero-section h1 {
    color: var(--heading);
    margin-bottom: 1rem;
    font-size: 2.5rem;
  }

  .subtitle {
    font-size: 1.2rem;
    color: var(--text);
    font-style: italic;
    margin-bottom: 0;
  }

  .bio-section {
    margin-bottom: 3rem;
  }

  .bio-section h2 {
    color: var(--heading);
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .bio-content p {
    color: var(--text);
    line-height: 1.6;
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .cta-section {
    margin-bottom: 3rem;
  }

  .cta-section h2 {
    color: var(--heading);
    margin-bottom: 2rem;
    text-align: center;
  }

  .cta-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .cta-card {
    background: var(--card-bg, #1a1a1a);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
  }

  .cta-card h3 {
    color: var(--heading);
    margin-bottom: 1rem;
    font-size: 1.3rem;
  }

  .cta-card p {
    color: var(--text);
    line-height: 1.5;
    margin-bottom: 1.5rem;
  }

  .cta-button {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-weight: 600;
    text-decoration: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.3s ease;
  }

  .cta-button.primary {
    background-color: var(--button-bg);
    color: white;
  }

  .cta-button.primary:hover,
  .cta-button.primary:focus {
    background-color: var(--button-hover-bg, #4a5568);
  }

  .cta-button.secondary {
    background-color: transparent;
    color: white;
    border: 3px solid var(--button-bg);
  }

  .cta-button.secondary:hover,
  .cta-button.secondary:focus {
    background-color: var(--button-bg);
    color: white;
  }

  .back-section {
    text-align: center;
    padding-top: 2rem;
    border-top: 1px solid var(--input-border);
  }

  .back-link {
    color: var(--text);
    text-decoration: none;
    font-style: italic;
    transition: color 0.3s ease;
  }

  .back-link:hover,
  .back-link:focus {
    color: var(--heading);
  }

  @media (max-width: 600px) {
    .hero-section h1 {
      font-size: 2rem;
    }
    
    .cta-cards {
      grid-template-columns: 1fr;
    }
    
    .paul-connect-page {
      padding: 1rem;
    }
  }
</style>
