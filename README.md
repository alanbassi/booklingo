# Booklingo

Booklingo is a local PDF reader for language study. It lets you upload English PDFs, select words or short phrases, translate them quickly, practice pronunciation, and save useful terms as flashcards.

This project was built through a Vibe Code workflow, starting from Google AI Studio and then refined with Codex.

## Features

- Local PDF upload and reading
- Recent book library stored in the browser with IndexedDB
- Text selection popover for quick translation
- Translation targets: Portuguese, Spanish, and Chinese
- Portuguese is the default translation language
- English text-to-speech for selected words and full pages
- Pronunciation practice using browser speech recognition
- YouGlish shortcut for real-world pronunciation examples
- ChatGPT shortcut for deeper explanations of selected phrases
- Flashcards saved locally in the browser
- Quizlet-friendly flashcard export
- Reader themes: light, sepia, and dark
- Zoom controls for comfortable reading

## Tech Stack

- React for the frontend interface
- TypeScript for typed application code
- Vite for local development and production builds
- Tailwind CSS via CDN for styling
- PDF.js via CDN for rendering PDFs in the browser
- IndexedDB for local storage of recent books and flashcards
- Web Speech API for text-to-speech and pronunciation practice

## Frontend

Booklingo is a pure frontend React app. It runs in the browser with Vite and does not require a backend server for the main reading, flashcard, storage, and pronunciation workflows.

The browser handles:

- PDF rendering through PDF.js
- Local persistence through IndexedDB
- Speech synthesis and speech recognition through the Web Speech API
- Translation requests through the public Google Translate endpoint

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
3. Open:
   `http://localhost:3000`

## Build

Run:

`npm run build`
