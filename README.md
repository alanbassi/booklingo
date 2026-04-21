<div align="center">

<img src="./assets/logo.png" alt="Booklingo logo" width="180" />

# Booklingo

### Read English PDFs, translate in context, practice pronunciation, and build flashcards.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)

</div>

## Overview

Booklingo is a local PDF reader for language study. Upload an English PDF, select words or short phrases, get quick translations, practice pronunciation, and save useful vocabulary as flashcards.

This project was built through a **Vibe Code** workflow, starting from **Google AI Studio** and then refined with **Codex**.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Notes](#notes)

## Features

- **PDF reader**: upload and read local PDF files in the browser.
- **Recent library**: keep recent books available with browser storage.
- **Quick translation**: select words or short phrases and translate instantly.
- **Multiple target languages**: Portuguese, Spanish, and Chinese.
- **Default Portuguese**: Portuguese is always the default translation language.
- **Pronunciation practice**: speak selected words and compare against browser speech recognition.
- **Text-to-speech**: hear selected words or full pages in English.
- **YouGlish shortcut**: open real-world pronunciation examples.
- **ChatGPT shortcut**: ask for a deeper explanation of selected phrases.
- **Flashcards**: save useful terms locally while reading.
- **Quizlet export**: copy flashcards in a Quizlet-friendly format.
- **Reader themes**: light, sepia, and dark modes.
- **Zoom controls**: adjust reading size comfortably.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| React | Frontend interface |
| TypeScript | Typed application code |
| Vite | Local dev server and production builds |
| Tailwind CSS via CDN | Styling and utility classes |
| PDF.js via CDN | PDF rendering in the browser |
| IndexedDB | Local storage for books and flashcards |
| Web Speech API | Text-to-speech and pronunciation practice |
| Google Translate endpoint | Quick translation requests |

## How It Works

Booklingo is a pure frontend React app. The main workflows run directly in the browser:

- PDF.js renders PDF pages.
- IndexedDB stores recent books and flashcards locally.
- The Web Speech API handles speech synthesis and speech recognition.
- Translation requests are sent to the public Google Translate endpoint.
- ChatGPT and YouGlish open as external helper tools.

No backend server is required for the core reading experience.

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Builds the app for production.

```bash
npm run preview
```

Previews the production build locally.

## Project Structure

```text
.
|-- components/
|   |-- DefinitionPopover.tsx
|   |-- FlashcardList.tsx
|   `-- Reader.tsx
|-- services/
|   |-- pdfService.ts
|   |-- storageService.ts
|   `-- translationService.ts
|-- App.tsx
|-- index.html
|-- index.tsx
|-- types.ts
|-- vite.config.ts
`-- package.json
```

## Notes

- Books and flashcards are stored locally in the user's browser.
- Clearing browser storage may remove saved books and flashcards.
- Speech recognition support depends on the browser.
- Translation quality depends on the external translation endpoint.

## License

MIT
