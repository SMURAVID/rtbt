/*
 * Generate a starry background by creating individual star elements
 * positioned randomly across the viewport. Each star gets a random
 * size, opacity, and animation delay to produce a natural looking
 * twinkling effect.
 */
document.addEventListener('DOMContentLoaded', () => {
  const starContainer = document.getElementById('star-container');
  const starCount = 250;

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.classList.add('star');

    // Randomise size between 1px and 3px
    const size = Math.random() * 2 + 1;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;

    // Randomise position across the viewport
    star.style.top = `${Math.random() * 100}%`;
    star.style.left = `${Math.random() * 100}%`;

    // Randomise initial opacity
    star.style.opacity = (Math.random() * 0.7 + 0.3).toFixed(2);

    // Randomise animation duration and delay so stars twinkle at different rates
    const duration = Math.random() * 3 + 2; // between 2s and 5s
    const delay = Math.random() * 4;        // between 0s and 4s
    star.style.animationDuration = `${duration}s`;
    star.style.animationDelay = `${delay}s`;

    starContainer.appendChild(star);
  }

  // Show the main content when the user submits their email.
  const startButton = document.getElementById('start-button');
  const emailInput = document.getElementById('email-input');
  const overlay = document.getElementById('overlay');
  const content = document.querySelector('.content');

  if (startButton) {
    startButton.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (email !== '') {
        // --- NEU: Webhook-Call an Make.com vor dem Ausblenden des Overlays ---
        try {
          await fetch(window.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          console.log('✅ E-Mail via Webhook gesendet:', email);
        } catch (err) {
          console.error('✖️ Fehler beim Webhook-Call:', err);
          // wir lassen die Experience trotzdem starten
        }
        // ------------------------------------------------------------------------

        // Dein bestehender Code zum Ausblenden des Overlays:
        overlay.style.display = 'none';
        if (content) {
          content.style.display = 'flex';
        }
      } else {
        // simple feedback: shake the input or change placeholder colour to hint an error
        emailInput.classList.add('input-error');
        setTimeout(() => emailInput.classList.remove('input-error'), 500);
      }
    });
  }
});
