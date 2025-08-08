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

  /*
   * Configuration for our Make.com webhooks.  The tokens/URLs here are
   * placeholders – replace the strings with the actual webhook URLs you
   * create in Make.  Each endpoint corresponds to a logical step in the
   * conversational flow.  See README.md for details on how to set these.
   */
  const API_CONFIG = {
    sessionStart: 'YOUR_SESSION_START_WEBHOOK_URL',
    tts: 'YOUR_TTS_WEBHOOK_URL',
    stt: 'YOUR_STT_WEBHOOK_URL',
    userMessage: 'YOUR_USER_MESSAGE_WEBHOOK_URL',
    finish: 'YOUR_FINISH_WEBHOOK_URL'
  };

  // Variables to hold session data and conversation state
  let sessionId = null;
  let initialGreeting = null;
  let currentLanguage = null;
  let conversationActive = false;

  if (startButton) {
    startButton.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (email !== '') {
        // --- Trigger legacy Make webhook to capture the email (optional) ---
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

        // Generate a unique session identifier for this visitor.  We use
        // crypto.randomUUID() which is available in modern browsers.  This
        // sessionId is passed to all subsequent webhook calls so that the
        // Make scenario can track each user separately.
        sessionId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
        window.sessionId = sessionId;

        // Prepare the payload for the session start webhook.  We include
        // consentVersion to capture which privacy policy the user accepted.
        const sessionPayload = {
          sessionId,
          email,
          consentVersion: '1.0'
        };
        // Call the session start endpoint.  This should return an
        // object with a `textToSpeak` property containing the welcome
        // message.  Store this for later so we can play it when the
        // visitor clicks the blob.  Any errors are logged but the
        // experience continues.
        try {
          const res = await fetch(API_CONFIG.sessionStart, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionPayload)
          });
          if (res.ok) {
            const data = await res.json();
            initialGreeting = data.textToSpeak || null;
            // The server may also return a language hint; capture it
            if (data.language) currentLanguage = data.language;
            console.log('Session started, greeting received');
          } else {
            console.warn('Session start webhook returned non-OK status');
          }
        } catch (err) {
          console.error('Error during session start webhook:', err);
        }

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

  /*
   * Set up the click handler on the heart blob.  When the blob is
   * clicked the conversation begins: we speak the greeting returned from
   * the sessionStart endpoint and then enter a loop of listening for
   * user input, sending it to the Make scenario and speaking the
   * subsequent questions until the roadmap is ready.  We guard
   * against multiple simultaneous conversations with the
   * `conversationActive` flag.
   */
  const blobLink = document.querySelector('.blob-link');
  if (blobLink) {
    blobLink.addEventListener('click', async (e) => {
      e.preventDefault();
      // Prevent starting multiple simultaneous conversations
      if (conversationActive) return;
      conversationActive = true;

      // Speak the initial greeting if available.  If not, use a
      // fallback message.
      const greetingText = initialGreeting ||
        'Welcome to the RTBT experience. Please tell me your name and preferred language to begin.';
      await speak(greetingText);

      // Begin the main conversation loop
      await conversationLoop();

      conversationActive = false;
    });
  }

  /*
   * Send text to our TTS webhook and play the resulting audio.  The
   * Make scenario hides the ElevenLabs API key, so the website never
   * exposes it.  The response is expected to be an audio file (MP3
   * or similar).  We convert the response to a blob and play it
   * using the browser Audio API.
   */
  async function speak(text) {
    if (!text) return;
    try {
      const res = await fetch(API_CONFIG.tts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          text,
          language: currentLanguage || 'en',
          voice: 'alloy'
        })
      });
      if (!res.ok) {
        console.warn('TTS request failed');
        return;
      }
      const arrayBuffer = await res.arrayBuffer();
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
      // Wait for playback to finish
      await new Promise(resolve => {
        audio.addEventListener('ended', resolve);
      });
    } catch (err) {
      console.error('Error during TTS playback:', err);
    }
  }

  /*
   * Record audio from the user's microphone for a fixed duration and
   * return it as a blob.  We keep this simple by recording for 15
   * seconds.  In a future iteration you could implement silence
   * detection or allow the user to manually stop recording.
   */
  async function recordAudio() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        // stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
        resolve(blob);
      };
      mediaRecorder.start();
      // Stop recording after 15 seconds
      setTimeout(() => mediaRecorder.stop(), 15000);
    });
  }

  /*
   * Send recorded audio to our STT webhook.  The response should
   * contain a property `text` with the transcription.  If the
   * transcription fails we return an empty string.
   */
  async function transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('audio', audioBlob, 'recording.webm');
    try {
      const res = await fetch(API_CONFIG.stt, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        console.warn('STT request failed');
        return '';
      }
      const data = await res.json();
      return data.text || '';
    } catch (err) {
      console.error('Error during STT:', err);
      return '';
    }
  }

  /*
   * Send the user's transcribed message to our Make scenario.  The
   * response should include the next `textToSpeak` and the current
   * `step`.  When the step is `roadmap_ready` we break the loop and
   * show a final button.
   */
  async function sendUserMessage(message) {
    try {
      const res = await fetch(API_CONFIG.userMessage, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, text: message })
      });
      if (!res.ok) {
        console.warn('User message webhook failed');
        return null;
      }
      const data = await res.json();
      // Update language if server suggests one
      if (data.language) currentLanguage = data.language;
      return data;
    } catch (err) {
      console.error('Error sending user message:', err);
      return null;
    }
  }

  /*
   * Main conversation loop.  This function repeatedly records audio,
   * transcribes it, sends the text to the scenario and speaks the
   * response.  When the scenario indicates that the roadmap is ready
   * we end the conversation and reveal the finish button.
   */
  async function conversationLoop() {
    let continueConversation = true;
    while (continueConversation) {
      // Listen to the user
      const audioBlob = await recordAudio();
      const userText = await transcribeAudio(audioBlob);
      if (!userText) {
        // If nothing was transcribed prompt the user again
        await speak('I did not catch that. Could you please repeat?');
        continue;
      }
      const response = await sendUserMessage(userText);
      if (!response) {
        await speak('There was a problem processing your answer. Let us move on.');
        continue;
      }
      const { textToSpeak, step } = response;
      if (textToSpeak) {
        await speak(textToSpeak);
      }
      if (step === 'roadmap_ready' || step === 'done') {
        // Conversation finished.  Show finish button and stop loop
        showFinishButton();
        continueConversation = false;
      }
    }
  }

  /*
   * Display a finish button that lets the user retrieve their
   * personalised roadmap.  When clicked we call the finish webhook
   * which writes everything to Google Sheets and triggers the final
   * email.  After completion we reset the page state.
   */
  function showFinishButton() {
    // Create overlay div for the finish prompt
    const finishOverlay = document.createElement('div');
    finishOverlay.className = 'overlay';
    const container = document.createElement('div');
    container.className = 'overlay-container';
    const heading = document.createElement('p');
    heading.className = 'overlay-text';
    heading.textContent = 'Your Personal Heart Roadmap is ready!';
    const btn = document.createElement('button');
    btn.className = 'start-button';
    btn.textContent = 'GET IT';
    container.appendChild(heading);
    container.appendChild(btn);
    finishOverlay.appendChild(container);
    document.body.appendChild(finishOverlay);

    btn.addEventListener('click', async () => {
      try {
        await fetch(API_CONFIG.finish, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
      } catch (err) {
        console.error('Error calling finish webhook:', err);
      }
      // Reload the page to reset the experience
      window.location.reload();
    });
  }
});
