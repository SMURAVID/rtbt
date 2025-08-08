# RTBT Heart Experience (MVP)

This repository contains a simple static website for the **RTBT Heart Experience**.  The
experience asks visitors a series of questions and generates a personal
heart roadmap by orchestrating several Make.com webhooks.  This
repository previously only collected an email address; it has been
extended to support an end‑to‑end voice conversation using speech
recognition and text‑to‑speech services.

## How it works

1. **Email capture:**  When a visitor enters their email address the
   website sends it to a legacy Make.com webhook (`window.webhookUrl` in
   `index.html`).  The script also generates a unique `sessionId`
   for the visitor and calls a new Make.com webhook to start the
   session.  The session start webhook should return a welcome
   message (`textToSpeak`) which is stored until the visitor clicks
   the blob.

2. **Conversation loop:**  When the visitor clicks the blob the
   website plays the welcome message, then repeatedly:

   * records the visitor’s answer using the browser microphone;
   * sends the audio to a Make.com webhook for speech‑to‑text (STT);
   * forwards the transcription to another webhook that generates the
     next question or, after the 5th answer, assembles a heart
     roadmap;
   * plays the returned text via a text‑to‑speech (TTS) webhook.

   The loop ends when the webhook indicates that the roadmap is ready.

3. **Finish:**  Once the roadmap is ready the visitor sees a
   “GET IT” button.  Clicking this calls a final webhook which
   writes all session data to Google Sheets and sends the roadmap
   email.  The page then reloads for the next visitor.

All state is keyed by the `sessionId` so multiple visitors can use
the experience concurrently.  The browser never sees any API keys
because TTS/STT calls are proxied through Make.com.

## Configuring the webhooks

The file `script.js` contains an `API_CONFIG` object with
placeholder URLs:

```js
const API_CONFIG = {
  sessionStart: 'YOUR_SESSION_START_WEBHOOK_URL',
  tts: 'YOUR_TTS_WEBHOOK_URL',
  stt: 'YOUR_STT_WEBHOOK_URL',
  userMessage: 'YOUR_USER_MESSAGE_WEBHOOK_URL',
  finish: 'YOUR_FINISH_WEBHOOK_URL'
};
```

You must create five separate webhooks in Make.com and replace each
placeholder with the corresponding URL:

* **Session Start** – accepts `{sessionId, email, consentVersion}` and
  returns `{textToSpeak, language?}`.
* **TTS** – accepts `{sessionId, text, language, voice}` and returns
  an audio file (e.g. MP3).  Internally this module should call
  ElevenLabs or another TTS provider; keep your API key inside
  Make.com.
* **STT** – accepts multipart form data with `sessionId` and
  `audio` and returns `{text}`.  Use Whisper or another STT module.
* **User Message** – accepts `{sessionId, text}` and returns
  `{textToSpeak, step, language?}`.  Here you implement your GPT logic
  to handle the welcome, questions 1–5 and roadmap summary.
* **Finish** – accepts `{sessionId}` and writes all answers to
  Google Sheets, sends the roadmap email and returns an empty
  response.

The repository includes only the front‑end.  You can design your
Make scenario based on the [architecture described in the
conversation](../README.md) or the specification provided to your GPT
assistant.

## Privacy policy

The `index.html` file still contains a placeholder for your privacy
policy.  Ensure that you add the final text and update the
`consentVersion` in `script.js` whenever you revise it.

## Development

No build tools are required; the site is fully static.  To develop
locally run a static server or open `index.html` directly in a
browser.  When deploying to GitHub Pages ensure that all webhook
URLs are correctly set and that your Make scenario is published.