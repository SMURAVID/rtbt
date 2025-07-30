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
});